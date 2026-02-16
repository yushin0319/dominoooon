import { create } from 'zustand';
import type { GameState, CardDef, ShuffleFn } from '../types';
import { createGame, endTurn } from '../domain/game';
import { playActionCard, buyCard as turnBuyCard, advancePhase } from '../domain/turn';
import { resolvePendingEffect } from '../domain/effect';
import type { PendingEffectChoice } from '../domain/effect';
import { bigMoneyTurn } from '../ai/bigMoney';
import { bigMoneySmithyTurn } from '../ai/bigMoneySmithy';
import { createShuffleFn } from '../domain/shuffle';

type Page = 'title' | 'setup' | 'game' | 'result';
type AIStrategy = 'bigMoney' | 'bigMoneySmithy';

interface GameStore {
  page: Page;
  gameState: GameState | null;
  aiStrategy: AIStrategy;
  shuffleFn: ShuffleFn;

  goToTitle: () => void;
  goToSetup: () => void;
  goToResult: () => void;
  startGame: (kingdom: CardDef[], ai: AIStrategy) => void;

  playAction: (instanceId: string) => void;
  skipAction: () => void;
  buyCard: (cardName: string) => void;
  skipBuy: () => void;
  resolvePending: (choice: PendingEffectChoice) => void;
  executeAITurn: () => void;

  isHumanTurn: () => boolean;
  isAITurn: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  page: 'title',
  gameState: null,
  aiStrategy: 'bigMoney',
  shuffleFn: createShuffleFn(),

  goToTitle: () => set({ page: 'title', gameState: null }),
  goToSetup: () => set({ page: 'setup' }),
  goToResult: () => set({ page: 'result' }),

  startGame: (kingdom, ai) => {
    const { shuffleFn } = get();
    const gs = createGame(['あなた', 'AI'], kingdom, shuffleFn);
    set({ page: 'game', gameState: gs, aiStrategy: ai });
  },

  playAction: (instanceId) => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      console.warn('playAction called with no gameState');
      return;
    }
    const next = playActionCard(gameState, instanceId, shuffleFn);
    set({ gameState: next });
  },

  skipAction: () => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      console.warn('skipAction called with no gameState');
      return;
    }
    const next = advancePhase(gameState, shuffleFn);
    set({ gameState: next });
  },

  buyCard: (cardName) => {
    const { gameState } = get();
    if (!gameState) {
      console.warn('buyCard called with no gameState');
      return;
    }
    const next = turnBuyCard(gameState, cardName);
    set({ gameState: next });
  },

  skipBuy: () => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      console.warn('skipBuy called with no gameState');
      return;
    }
    const next = endTurn(gameState, shuffleFn);
    if (next.gameOver) {
      set({ gameState: next, page: 'result' });
    } else {
      set({ gameState: next });
    }
  },

  resolvePending: (choice) => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      console.warn('resolvePending called with no gameState');
      return;
    }
    if (!gameState.pendingEffect) {
      console.warn('resolvePending called with no pendingEffect');
      return;
    }
    const next = resolvePendingEffect(gameState, choice, shuffleFn);
    set({ gameState: next });
  },

  executeAITurn: () => {
    const { gameState, aiStrategy, shuffleFn } = get();
    if (!gameState) {
      console.warn('executeAITurn called with no gameState');
      return;
    }
    const turnFn = aiStrategy === 'bigMoneySmithy' ? bigMoneySmithyTurn : bigMoneyTurn;
    const next = turnFn(gameState, shuffleFn);
    if (next.gameOver) {
      set({ gameState: next, page: 'result' });
    } else {
      set({ gameState: next });
    }
  },

  isHumanTurn: () => {
    const { gameState } = get();
    return gameState !== null && gameState.currentPlayerIndex === 0;
  },

  isAITurn: () => {
    const { gameState } = get();
    return gameState !== null && gameState.currentPlayerIndex === 1;
  },
}));
