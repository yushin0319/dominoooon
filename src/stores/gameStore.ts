import { create } from 'zustand';
import { bigMoneyTurn } from '../ai/bigMoney';
import { bigMoneySmithyTurn } from '../ai/bigMoneySmithy';
import type { PendingEffectChoice } from '../domain/effect';
import { resolvePendingEffect } from '../domain/effect';
import { addLog, createGame, endTurn } from '../domain/game';
import { createShuffleFn } from '../domain/shuffle';
import {
  advancePhase,
  playActionCard,
  buyCard as turnBuyCard,
} from '../domain/turn';
import { shouldAutoSkipActionPhase } from '../lib/turnFlow';
import { getEffectText } from '../lib/utils';
import type { CardDef, GameState, ShuffleFn } from '../types';
import { Phase } from '../types';

/**
 * Design Decision: Store Security
 *
 * This store exposes mutable state directly. This is intentional because:
 * - This is a single-player game against AI, so there's no competitive advantage
 *   to manipulating state
 * - Adding immutability layers (Immer, readonly wrappers) would add complexity
 *   without meaningful benefit
 * - If multiplayer is added in the future, server-side validation will be needed
 *   regardless of client-side protection
 */

type Page = 'title' | 'setup' | 'game' | 'result';
type AIStrategy = 'bigMoney' | 'bigMoneySmithy';

/** 直前の購入（取り消せるのはこの 1 回だけ） */
interface LastBuy {
  /** 買う前の状態（取り消したらここに戻す） */
  before: GameState;
  /** 買った直後の状態（今の状態がこれのままのときだけ取り消せる） */
  after: GameState;
  cardName: string;
}

/**
 * 人間の番で使えるアクションが無ければ、購入フェーズへ自動で進める（財宝も自動で場に出る）。
 * 「アクションスキップ」を押すまで止まっていたのをやめた。購入以外の操作のあとに毎回通す（commit）。
 */
function autoAdvance(state: GameState, shuffleFn: ShuffleFn): GameState {
  return shouldAutoSkipActionPhase(state)
    ? advancePhase(state, shuffleFn)
    : state;
}

interface GameStore {
  page: Page;
  gameState: GameState | null;
  /** 直前の購入。取り消せるのは買った直後の状態のままのときだけ（selectUndoableBuy） */
  lastBuy: LastBuy | null;
  aiStrategy: AIStrategy;
  shuffleFn: ShuffleFn;

  goToTitle: () => void;
  goToSetup: () => void;
  goToResult: () => void;
  startGame: (kingdom: CardDef[], ai: AIStrategy) => void;

  playAction: (instanceId: string) => void;
  skipAction: () => void;
  buyCard: (cardName: string) => void;
  /** 直前の 1 回の購入を取り消す（取り消せる購入が無ければ何もしない） */
  undoBuy: () => void;
  skipBuy: () => void;
  resolvePending: (choice: PendingEffectChoice) => void;
  executeAITurn: () => void;
}

/** 今取り消せる購入のカード名。買った直後の状態のままのときだけ（何か操作をしたら取り消せない） */
export function selectUndoableBuy(
  s: Pick<GameStore, 'gameState' | 'lastBuy'>,
): string | null {
  return s.lastBuy && s.gameState === s.lastBuy.after
    ? s.lastBuy.cardName
    : null;
}

export const useGameStore = create<GameStore>((set, get) => {
  /**
   * 購入以外の操作の結果を反映する。使えるアクションが無ければ購入フェーズへ自動で進め、
   * 取り消し用の購入の記録は捨てる（どの操作もここを通すので、進め忘れ・消し忘れが起きない）
   */
  const commit = (next: GameState, extra: Partial<GameStore> = {}) =>
    set({
      ...extra,
      gameState: autoAdvance(next, get().shuffleFn),
      lastBuy: null,
    });

  return {
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiStrategy: 'bigMoney',
    shuffleFn: createShuffleFn(),

    goToTitle: () => set({ page: 'title', gameState: null, lastBuy: null }),
    goToSetup: () => set({ page: 'setup' }),
    goToResult: () => set({ page: 'result' }),

    startGame: (kingdom, ai) => {
      const { shuffleFn } = get();
      const gs = createGame(['あなた', 'AI'], kingdom, shuffleFn);
      commit(gs, { page: 'game', aiStrategy: ai });
    },

    playAction: (instanceId) => {
      const { gameState, shuffleFn } = get();
      if (!gameState) {
        throw new Error('playAction called with no gameState');
      }
      const player = gameState.players[gameState.currentPlayerIndex];
      const card = player.hand.find((c) => c.instanceId === instanceId);
      if (!card) {
        console.warn('playAction: card not found');
        return;
      }
      const cardName = card.def.nameJa ?? card.def.name;
      const effectStr = getEffectText(card.def);
      const effectSuffix = effectStr ? `（${effectStr}）` : '';

      const withLog = addLog(
        gameState,
        `あなたは${cardName}をプレイしました${effectSuffix}`,
      );
      commit(playActionCard(withLog, instanceId, shuffleFn));
    },

    skipAction: () => {
      const { gameState, shuffleFn } = get();
      if (!gameState) {
        throw new Error('skipAction called with no gameState');
      }
      // 「購入へ進む」はアクションフェーズのときだけ（購入フェーズで呼ぶとクリーンアップに進んでしまう）
      if (gameState.phase !== Phase.Action) return;
      commit(advancePhase(gameState, shuffleFn));
    },

    buyCard: (cardName) => {
      const { gameState } = get();
      if (!gameState) {
        throw new Error('buyCard called with no gameState');
      }
      const supplyEntry = gameState.supply.find(
        (s) => s.card.name === cardName,
      );
      const displayName = supplyEntry?.card.nameJa ?? cardName;
      const withLog = addLog(gameState, `あなたは${displayName}を購入しました`);
      const next = turnBuyCard(withLog, cardName);
      set({
        gameState: next,
        lastBuy: { before: gameState, after: next, cardName },
      });
    },

    undoBuy: () => {
      const state = get();
      const { lastBuy } = state;
      if (!lastBuy || !selectUndoableBuy(state)) return;
      // 買う前の状態に戻す（ログの「購入しました」も消える）。取り消せるのは 1 回だけ
      set({ gameState: lastBuy.before, lastBuy: null });
    },

    skipBuy: () => {
      const { gameState, shuffleFn } = get();
      if (!gameState) {
        throw new Error('skipBuy called with no gameState');
      }
      // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う
      commit(endTurn(gameState, shuffleFn));
    },

    resolvePending: (choice) => {
      const { gameState, shuffleFn } = get();
      if (!gameState) {
        throw new Error('resolvePending called with no gameState');
      }
      if (!gameState.pendingEffect) {
        throw new Error('resolvePending called with no pendingEffect');
      }
      commit(resolvePendingEffect(gameState, choice, shuffleFn));
    },

    executeAITurn: () => {
      const { gameState, aiStrategy, shuffleFn } = get();
      if (!gameState) {
        throw new Error('executeAITurn called with no gameState');
      }
      const turnFn =
        aiStrategy === 'bigMoneySmithy' ? bigMoneySmithyTurn : bigMoneyTurn;
      // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う。
      // 人間の番に戻ったとき、使えるアクションが無ければ購入フェーズから始める（commit）
      commit(turnFn(gameState, shuffleFn));
    },
  };
});
