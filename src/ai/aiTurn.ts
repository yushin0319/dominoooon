/**
 * AI のターンを「使ったアクション → 財宝を場に出す → 購入」の段階に分ける。
 *
 * 以前は AI のターン全体を一度に進めていたので、画面には結果しか出ず、
 * AI が何を出して何を買ったのかが分からなかった（何も買わなかったターンはログにも残らなかった）。
 * ここでは各段階の状態を順に作り、画面（GamePage）がそれを少しずつ見せる。
 * 何を使い・何を買うかは各戦略（bigMoney.ts / bigMoneySmithy.ts）が決め、ここでは変えない。
 */

import { addLog, endTurn } from '../domain/game';
import { advancePhase } from '../domain/turn';
import { getEffectText } from '../lib/utils';
import type { CardDef, GameState, ShuffleFn } from '../types';
import { Phase } from '../types';

/** 何を使い・何を買うか（AI の戦略） */
export interface AITurnStrategy {
  /**
   * アクションフェーズで使うアクションを使う（フェーズは進めない）。
   * 選択待ち（pendingEffect）が出るカードは使わない前提（段階を見せる間、AI は選択待ちを解決しない）
   */
  playActions: (state: GameState, shuffleFn: ShuffleFn) => GameState;
  /** 購入フェーズで買う（ログは書かない。まとめの 1 行は planAITurn が書く） */
  buy: (state: GameState) => GameState;
}

/** action = 使ったアクション / treasure = 財宝を場に出した / buy = 買った */
export type AITurnStepKind = 'action' | 'treasure' | 'buy';

export interface AITurnStep {
  kind: AITurnStepKind;
  /** この段階を見せている間の状態（番はまだ AI） */
  state: GameState;
  /** 帯に出す一言 */
  message: string;
}

export interface AITurnPlan {
  steps: AITurnStep[];
  /** ターンを終えたあとの状態（番は次の人へ） */
  final: GameState;
}

/** 同じカードは「×枚数」でまとめ、出てきた順に「・」でつなぐ（例: 銅貨×3・銀貨） */
export function formatCardList(cards: CardDef[]): string {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.nameJa, (counts.get(card.nameJa) ?? 0) + 1);
  }
  return [...counts]
    .map(([name, count]) => (count > 1 ? `${name}×${count}` : name))
    .join('・');
}

/** ログに残すまとめの 1 行（何も買わなかったターンも残す） */
export function summarizeAIBuy(coins: number, bought: CardDef[]): string {
  const result =
    bought.length > 0 ? `${formatCardList(bought)}を購入` : '購入なし';
  return `AI: ${coins} コイン → ${result}`;
}

/** カードの効果を（）で添える（自分のログの「あなたは村をプレイしました（+1 ドロー、+2 アクション）」と同じ書き方） */
function effectSuffix(def: CardDef): string {
  const effect = getEffectText(def);
  return effect ? `（${effect}）` : '';
}

/** AI のターンを段階に分けて、各段階の状態と最後の状態を作る */
export function planAITurn(
  state: GameState,
  strategy: AITurnStrategy,
  shuffleFn: ShuffleFn,
): AITurnPlan {
  const idx = state.currentPlayerIndex;
  const steps: AITurnStep[] = [];
  let s = addLog(state, `--- ターン${state.turnNumber}: AIのターン ---`);

  if (s.phase === Phase.Action) {
    // 1. アクション（使ったカードは場の末尾に増える）
    const playedFrom = s.players[idx].playArea.length;
    let afterActions = strategy.playActions(s, shuffleFn);
    const played = afterActions.players[idx].playArea
      .slice(playedFrom)
      .map((c) => c.def);
    if (played.length > 0) {
      for (const def of played) {
        afterActions = addLog(
          afterActions,
          `AIは${def.nameJa}をプレイしました${effectSuffix(def)}`,
        );
      }
      // 帯の一言は短く: 効果は 1 枚だけのときに添える
      const effect = played.length === 1 ? effectSuffix(played[0]) : '';
      steps.push({
        kind: 'action',
        state: afterActions,
        message: `AIが${formatCardList(played)}をプレイ${effect}`,
      });
    }

    // 2. 購入フェーズへ進む（手札の財宝が自動で場に出る）
    const treasureFrom = afterActions.players[idx].playArea.length;
    s = advancePhase(afterActions, shuffleFn);
    const treasures = s.players[idx].playArea
      .slice(treasureFrom)
      .map((c) => c.def);
    const { coins } = s.turnState;
    steps.push({
      kind: 'treasure',
      state: s,
      message:
        treasures.length > 0
          ? `AIが財宝を出しました: ${formatCardList(treasures)} → ${coins} コイン`
          : `AIの手札に財宝はありません（${coins} コイン）`,
    });
  }

  // 3. 購入（買ったカードは捨て札の末尾に増える）。まとめの 1 行には買う前のコインを書く
  const coinsBeforeBuy = s.turnState.coins;
  const boughtFrom = s.players[idx].discard.length;
  let afterBuy = strategy.buy(s);
  const bought = afterBuy.players[idx].discard
    .slice(boughtFrom)
    .map((c) => c.def);
  afterBuy = addLog(afterBuy, summarizeAIBuy(coinsBeforeBuy, bought));
  steps.push({
    kind: 'buy',
    state: afterBuy,
    message:
      bought.length > 0
        ? `AIが${formatCardList(bought)}を購入`
        : 'AIは何も買いませんでした',
  });

  return { steps, final: endTurn(afterBuy, shuffleFn) };
}
