import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AITurnStep, planAITurn } from '../ai/aiTurn';
import { bigMoneyStrategy } from '../ai/bigMoney';
import { bigMoneySmithyStrategy } from '../ai/bigMoneySmithy';
import { getCardDef } from '../domain/card';
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
import type {
  AIStrategy,
  CardDef,
  GameSetup,
  GameState,
  Page,
  ShuffleFn,
} from '../types';
import { Phase } from '../types';
import {
  createSaveStorage,
  SAVE_KEY,
  SAVE_VERSION,
  type SavedGame,
} from './gameSave';

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

/** 直前の購入（取り消せるのはこの 1 回だけ） */
interface LastBuy {
  /** 買う前の状態（取り消したらここに戻す） */
  before: GameState;
  /** 買った直後の状態（今の状態がこれのままのときだけ取り消せる） */
  after: GameState;
  cardName: string;
}

/** 段階ごとに見せている途中の AI のターン */
export interface AITurnPlayback {
  steps: AITurnStep[];
  /** 今見せている段階 */
  index: number;
  /** ターンを終えたあとの状態（スキップしたらすぐここへ） */
  final: GameState;
}

/** 人間のプレイヤーの番号（players[0]）。AI はそれ以外 */
const HUMAN_PLAYER_INDEX = 0;

/** AI のターンを進めてよいか（AI の番で、選択待ちが無く、ゲーム中） */
function isAITurnState(state: GameState): boolean {
  return (
    state.currentPlayerIndex !== HUMAN_PLAYER_INDEX &&
    !state.gameOver &&
    !state.pendingEffect
  );
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
  /** 段階ごとに見せている途中の AI のターン（見せていなければ null） */
  aiTurn: AITurnPlayback | null;
  aiStrategy: AIStrategy;
  /** 前回ゲームを始めたときの設定（「同じキングダムでもう一度」に使う） */
  lastSetup: GameSetup | null;
  shuffleFn: ShuffleFn;

  /** タイトルへ（途中のゲームは捨てる。ゲーム中の「やめる」・結果画面の「タイトルに戻る」） */
  goToTitle: () => void;
  goToSetup: () => void;
  goToResult: () => void;
  startGame: (kingdom: CardDef[], ai: AIStrategy) => void;
  /** 前回と同じキングダム・AI で新しいゲームを始める（前回の設定が無ければ何もしない） */
  restartGame: () => void;

  playAction: (instanceId: string) => void;
  skipAction: () => void;
  buyCard: (cardName: string) => void;
  /** 直前の 1 回の購入を取り消す（取り消せる購入が無ければ何もしない） */
  undoBuy: () => void;
  skipBuy: () => void;
  resolvePending: (choice: PendingEffectChoice) => void;
  /** AI のターンを段階に分けて、最初の段階を見せる（使ったアクション or 財宝を場に出したところ） */
  startAITurn: () => void;
  /** AI のターンの次の段階を見せる。最後の段階のあとはターンを終えて人間の番へ */
  advanceAITurn: () => void;
  /** AI のターンを最後まで一度に進める（見せている途中なら、その続きをすぐ終わらせる = スキップ） */
  executeAITurn: () => void;
}

/** 今見せている AI のターンの段階（見せていなければ null） */
export function selectAITurnStep(
  s: Pick<GameStore, 'aiTurn'>,
): AITurnStep | null {
  return s.aiTurn ? s.aiTurn.steps[s.aiTurn.index] : null;
}

/** 今取り消せる購入のカード名。買った直後の状態のままのときだけ（何か操作をしたら取り消せない） */
export function selectUndoableBuy(
  s: Pick<GameStore, 'gameState' | 'lastBuy'>,
): string | null {
  return s.lastBuy && s.gameState === s.lastBuy.after
    ? s.lastBuy.cardName
    : null;
}

/**
 * 見せている途中の AI のターン。今の状態が見せている段階のままのときだけ返す
 * （ほかの経路で状態が変わっていたら、その段階はもう古い）
 */
function selectLivePlayback(
  s: Pick<GameStore, 'gameState' | 'aiTurn'>,
): AITurnPlayback | null {
  const { gameState, aiTurn } = s;
  return aiTurn && gameState === aiTurn.steps[aiTurn.index].state
    ? aiTurn
    : null;
}

/**
 * 保存するもの（シャッフル関数・見せている途中の AI のターンは入れない）。
 * AI のターンを見せている途中なら、ターンを最後まで進めた状態（スキップと同じ結果）を保存する。
 * 見せている途中の状態を保存すると、読み直したときに AI がもう一度買ってしまう
 */
function toSavedGame(s: GameStore): SavedGame {
  const undoable = selectUndoableBuy(s);
  return {
    page: s.page,
    gameState: selectLivePlayback(s)?.final ?? s.gameState,
    undo:
      undoable && s.lastBuy
        ? { before: s.lastBuy.before, cardName: undoable }
        : null,
    aiStrategy: s.aiStrategy,
    lastSetup: s.lastSetup,
  };
}

/**
 * 保存データをストアに戻す。保存データは gameSave.ts で形を確かめてある（壊れていれば届かない）。
 * 取り消せる購入は「買った直後の状態」を読み直した状態に結び直す
 */
function fromSavedGame(saved: SavedGame, current: GameStore): GameStore {
  const { gameState, undo } = saved;
  const lastBuy =
    undo && gameState
      ? { before: undo.before, after: gameState, cardName: undo.cardName }
      : null;
  return {
    ...current,
    page: saved.page,
    gameState,
    lastBuy,
    aiTurn: null,
    aiStrategy: saved.aiStrategy,
    lastSetup: saved.lastSetup,
  };
}

/** ストアの中身（途中保存の persist で包む前） */
const createGameStore: StateCreator<
  GameStore,
  [['zustand/persist', unknown]]
> = (set, get) => {
  /**
   * 購入以外の操作の結果を反映する。使えるアクションが無ければ購入フェーズへ自動で進め、
   * 取り消し用の購入の記録と、見せている途中の AI のターンは捨てる
   * （どの操作もここを通すので、進め忘れ・消し忘れが起きない）
   */
  const commit = (next: GameState, extra: Partial<GameStore> = {}) =>
    set({
      ...extra,
      gameState: autoAdvance(next, get().shuffleFn),
      lastBuy: null,
      aiTurn: null,
    });

  /**
   * 見せている途中の AI のターン。今の状態が見せている段階のままのときだけ返し、
   * ほかの経路で状態が変わっていたら捨てる（古い段階・古い結果で上書きしないように）
   */
  const livePlayback = (): AITurnPlayback | null => {
    const state = get();
    const playback = selectLivePlayback(state);
    if (!playback && state.aiTurn) set({ aiTurn: null });
    return playback;
  };

  /** AI のターンを段階に分ける（何を使い・何を買うかは選んだ戦略のまま） */
  const planCurrentAITurn = (gameState: GameState) => {
    const { aiStrategy, shuffleFn } = get();
    const strategy =
      aiStrategy === 'bigMoneySmithy'
        ? bigMoneySmithyStrategy
        : bigMoneyStrategy;
    return planAITurn(gameState, strategy, shuffleFn);
  };

  return {
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
    aiStrategy: 'bigMoney',
    lastSetup: null,
    shuffleFn: createShuffleFn(),

    goToTitle: () =>
      set({ page: 'title', gameState: null, lastBuy: null, aiTurn: null }),
    // 結果画面から設定を選び直すときも、終わったゲームは残さない
    goToSetup: () =>
      set({ page: 'setup', gameState: null, lastBuy: null, aiTurn: null }),
    goToResult: () => set({ page: 'result' }),

    startGame: (kingdom, ai) => {
      const { shuffleFn } = get();
      const gs = createGame(['あなた', 'AI'], kingdom, shuffleFn);
      commit(gs, {
        page: 'game',
        aiStrategy: ai,
        lastSetup: { kingdom: kingdom.map((c) => c.name), aiStrategy: ai },
      });
    },

    restartGame: () => {
      const { lastSetup, startGame } = get();
      if (!lastSetup) return;
      startGame(lastSetup.kingdom.map(getCardDef), lastSetup.aiStrategy);
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

    startAITurn: () => {
      const { gameState } = get();
      if (!gameState) {
        throw new Error('startAITurn called with no gameState');
      }
      // 見せている途中なら最初からやり直さない。人間の番・選択待ち・ゲーム終了後は始めない
      if (livePlayback() || !isAITurnState(gameState)) return;
      const plan = planCurrentAITurn(gameState);
      set({
        gameState: plan.steps[0].state,
        aiTurn: {
          steps: plan.steps,
          index: 0,
          // 人間の番に戻ったときの形（使えるアクションが無ければ購入フェーズ）にしておく。
          // commit と同じ結果を途中保存もそのまま使える（読み直したあとに進め直さなくてよい）
          final: autoAdvance(plan.final, get().shuffleFn),
        },
      });
    },

    advanceAITurn: () => {
      const aiTurn = livePlayback();
      if (!aiTurn) return;
      const next = aiTurn.index + 1;
      if (next < aiTurn.steps.length) {
        set({
          gameState: aiTurn.steps[next].state,
          aiTurn: { ...aiTurn, index: next },
        });
        return;
      }
      // 最後の段階を見せ終えた: ターンを終えて人間の番へ。
      // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う。
      // 人間の番に戻ったとき、使えるアクションが無ければ購入フェーズから始める（commit）
      commit(aiTurn.final);
    },

    executeAITurn: () => {
      const { gameState } = get();
      if (!gameState) {
        throw new Error('executeAITurn called with no gameState');
      }
      // 見せている途中なら、段階に分けたときと同じ結果へすぐ進める（作り直すと山札の切り方が変わる）
      const aiTurn = livePlayback();
      if (aiTurn) {
        commit(aiTurn.final);
        return;
      }
      // スキップを続けて押したときに、人間の番を AI が進めないように
      if (!isAITurnState(gameState)) return;
      commit(planCurrentAITurn(gameState).final);
    },
  };
};

export const useGameStore = create<GameStore>()(
  persist(createGameStore, {
    // 途中保存（再読み込み・閉じても続きから）。何を保存し、どう戻すかは gameSave.ts / toSavedGame / fromSavedGame
    name: SAVE_KEY,
    version: SAVE_VERSION,
    storage: createSaveStorage(),
    partialize: toSavedGame,
    // 今は版 1 だけ。知らない版（古い版・新しい版）のデータは移し替えずに捨て、タイトルから始める
    migrate: (): SavedGame => ({
      page: 'title',
      gameState: null,
      undo: null,
      aiStrategy: 'bigMoney',
      lastSetup: null,
    }),
    merge: (persisted, current) =>
      persisted ? fromSavedGame(persisted as SavedGame, current) : current,
  }),
);
