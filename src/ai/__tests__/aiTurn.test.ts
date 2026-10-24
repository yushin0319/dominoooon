// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import { createGame, endTurn } from '../../domain/game';
import { getAllCards } from '../../domain/player';
import { createShuffleFn } from '../../domain/shuffle';
import type { GameState } from '../../types';
import { Phase } from '../../types';
import { formatCardList, planAITurn, summarizeAIBuy } from '../aiTurn';
import { bigMoneyAction, bigMoneyBuy, bigMoneyStrategy } from '../bigMoney';
import {
  bigMoneySmithyAction,
  bigMoneySmithyBuy,
  bigMoneySmithyStrategy,
} from '../bigMoneySmithy';

const shuffle = createShuffleFn(() => 0.5);

const kingdom = [
  'Village',
  'Smithy',
  'Market',
  'Festival',
  'Laboratory',
  'Cellar',
  'Moat',
  'Militia',
  'Mine',
  'Witch',
].map(getCardDef);

const mk = (names: string[]) =>
  names.map((n) => createCardInstance(getCardDef(n)));

/** AI（1 番）の番の始まり（アクションフェーズ）を作る */
function aiTurnStart(opts: {
  hand: string[];
  deck?: string[];
  turnNumber?: number;
}): GameState {
  const game = createGame(['あなた', 'AI'], kingdom, shuffle);
  const ai = {
    ...game.players[1],
    hand: mk(opts.hand),
    deck: mk(opts.deck ?? ['Copper', 'Copper', 'Copper', 'Estate', 'Estate']),
    discard: [],
    playArea: [],
  };
  return {
    ...game,
    players: [game.players[0], ai],
    currentPlayerIndex: 1,
    phase: Phase.Action,
    turnState: { actions: 1, buys: 1, coins: 0 },
    turnNumber: opts.turnNumber ?? 2,
    log: ['Game started'],
  };
}

const names = (cards: { def: { name: string } }[]) =>
  cards.map((c) => c.def.name);

describe('planAITurn: AI のターンを段階に分ける（財宝を場に出す → 購入）', () => {
  it('Big Money: 財宝を場に出す段階と購入の段階があり、最後に番が人間に戻る', () => {
    const start = aiTurnStart({
      hand: ['Copper', 'Copper', 'Copper', 'Silver', 'Estate'],
    });
    const plan = planAITurn(start, bigMoneyStrategy, shuffle);

    expect(plan.steps.map((s) => s.kind)).toEqual(['treasure', 'buy']);

    // 財宝を場に出した段階: AI の場に財宝が並び、コインが数えてある（まだ買っていない）
    const treasure = plan.steps[0].state;
    expect(treasure.currentPlayerIndex).toBe(1);
    expect(treasure.phase).toBe(Phase.Buy);
    expect(names(treasure.players[1].playArea)).toEqual([
      'Copper',
      'Copper',
      'Copper',
      'Silver',
    ]);
    expect(treasure.turnState.coins).toBe(5);
    expect(treasure.players[1].discard).toEqual([]);
    expect(plan.steps[0].message).toBe(
      'AIが財宝を出しました: 銅貨×3・銀貨 → 5 コイン',
    );

    // 購入の段階: 買ったカードが捨て札に入り、まとめの 1 行がログに残る（まだ番は AI）
    const buy = plan.steps[1].state;
    expect(buy.currentPlayerIndex).toBe(1);
    expect(names(buy.players[1].discard)).toEqual(['Silver']);
    expect(plan.steps[1].message).toBe('AIが銀貨を購入');
    expect(buy.log.slice(-2)).toEqual([
      '--- ターン2: AIのターン ---',
      'AI: 5 コイン → 銀貨を購入',
    ]);

    // 最後: ターンを終えて人間の番へ
    expect(plan.final.currentPlayerIndex).toBe(0);
    expect(plan.final.turnNumber).toBe(3);
    expect(plan.final.players[1].playArea).toEqual([]);
    expect(plan.final.log).toEqual(buy.log);
  });

  it('何も買わなかったターンも、まとめの 1 行をログに残す', () => {
    const start = aiTurnStart({
      hand: ['Copper', 'Copper', 'Estate', 'Estate', 'Estate'],
    });
    const plan = planAITurn(start, bigMoneyStrategy, shuffle);

    expect(plan.steps[1].message).toBe('AIは何も買いませんでした');
    expect(plan.final.log.slice(-2)).toEqual([
      '--- ターン2: AIのターン ---',
      'AI: 2 コイン → 購入なし',
    ]);
  });

  it('財宝が 1 枚も無いときは、そう伝える（0 コイン）', () => {
    const start = aiTurnStart({
      hand: ['Estate', 'Estate', 'Estate', 'Curse', 'Curse'],
    });
    const plan = planAITurn(start, bigMoneyStrategy, shuffle);

    expect(plan.steps[0].message).toBe(
      'AIの手札に財宝はありません（0 コイン）',
    );
    expect(plan.final.log.at(-1)).toBe('AI: 0 コイン → 購入なし');
  });

  it('鍛冶屋を使う AI: 使ったアクションの段階が先に入り、ログにも残る', () => {
    const start = aiTurnStart({
      hand: ['Smithy', 'Copper', 'Copper', 'Copper', 'Estate'],
      deck: ['Silver', 'Copper', 'Gold', 'Estate', 'Copper'],
    });
    const plan = planAITurn(start, bigMoneySmithyStrategy, shuffle);

    expect(plan.steps.map((s) => s.kind)).toEqual([
      'action',
      'treasure',
      'buy',
    ]);

    // アクションの段階: 鍛冶屋が場に出て、3 枚引いている（財宝はまだ手札）
    const action = plan.steps[0].state;
    expect(action.phase).toBe(Phase.Action);
    expect(names(action.players[1].playArea)).toEqual(['Smithy']);
    expect(action.players[1].hand).toHaveLength(7);
    expect(plan.steps[0].message).toBe('AIが鍛冶屋をプレイ（+3 ドロー）');
    expect(action.log.at(-1)).toBe('AIは鍛冶屋をプレイしました（+3 ドロー）');

    // 財宝の段階: 鍛冶屋の後ろに財宝が並ぶ（銅貨 4・銀貨・金貨 = 9 コイン）
    expect(plan.steps[1].message).toBe(
      'AIが財宝を出しました: 銅貨×4・銀貨・金貨 → 9 コイン',
    );
    expect(plan.steps[2].message).toBe('AIが属州を購入');
    expect(plan.final.log.slice(-3)).toEqual([
      '--- ターン2: AIのターン ---',
      'AIは鍛冶屋をプレイしました（+3 ドロー）',
      'AI: 9 コイン → 属州を購入',
    ]);
  });

  it('AI の戦略（何を買うか）は変えない: 段階に分けても、一度に進めたときと同じカード・サプライになる', () => {
    for (const [strategy, action, buy] of [
      [bigMoneyStrategy, bigMoneyAction, bigMoneyBuy],
      [bigMoneySmithyStrategy, bigMoneySmithyAction, bigMoneySmithyBuy],
    ] as const) {
      for (const hand of [
        ['Copper', 'Copper', 'Copper', 'Silver', 'Estate'],
        ['Smithy', 'Gold', 'Gold', 'Silver', 'Copper'],
        ['Copper', 'Estate', 'Estate', 'Estate', 'Copper'],
      ]) {
        const start = aiTurnStart({
          hand,
          deck: ['Gold', 'Silver', 'Copper', 'Estate', 'Copper'],
        });
        const plan = planAITurn(start, strategy, shuffle);
        const oneShot = endTurn(buy(action(start, shuffle)), shuffle);

        const sorted = (s: GameState) =>
          names(getAllCards(s.players[1])).sort();
        expect(sorted(plan.final)).toEqual(sorted(oneShot));
        expect(plan.final.supply).toEqual(oneShot.supply);
      }
    }
  });
});

describe('formatCardList / summarizeAIBuy: 文言', () => {
  it('同じカードは「×枚数」でまとめ、出てきた順に「・」でつなぐ', () => {
    expect(
      formatCardList(
        mk(['Copper', 'Silver', 'Copper', 'Gold', 'Copper']).map((c) => c.def),
      ),
    ).toBe('銅貨×3・銀貨・金貨');
    expect(formatCardList([])).toBe('');
  });

  it('まとめの 1 行: 「AI: N コイン → ○○を購入」、何も買わなければ「購入なし」', () => {
    expect(summarizeAIBuy(7, [getCardDef('Gold')])).toBe(
      'AI: 7 コイン → 金貨を購入',
    );
    expect(
      summarizeAIBuy(11, [getCardDef('Province'), getCardDef('Silver')]),
    ).toBe('AI: 11 コイン → 属州・銀貨を購入');
    expect(summarizeAIBuy(2, [])).toBe('AI: 2 コイン → 購入なし');
  });
});
