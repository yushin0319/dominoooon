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
import { getEffectText } from '../lib/utils';
import type { CardDef, GameState, ShuffleFn } from '../types';

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
    const next = playActionCard(withLog, instanceId, shuffleFn);
    set({ gameState: next });
  },

  skipAction: () => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      throw new Error('skipAction called with no gameState');
    }
    const next = advancePhase(gameState, shuffleFn);
    set({ gameState: next });
  },

  buyCard: (cardName) => {
    const { gameState } = get();
    if (!gameState) {
      throw new Error('buyCard called with no gameState');
    }
    const supplyEntry = gameState.supply.find((s) => s.card.name === cardName);
    const displayName = supplyEntry?.card.nameJa ?? cardName;
    const withLog = addLog(gameState, `あなたは${displayName}を購入しました`);
    const next = turnBuyCard(withLog, cardName);
    set({ gameState: next });
  },

  skipBuy: () => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      throw new Error('skipBuy called with no gameState');
    }
    const next = endTurn(gameState, shuffleFn);
    // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う
    set({ gameState: next });
  },

  resolvePending: (choice) => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      throw new Error('resolvePending called with no gameState');
    }
    if (!gameState.pendingEffect) {
      throw new Error('resolvePending called with no pendingEffect');
    }
    const next = resolvePendingEffect(gameState, choice, shuffleFn);
    set({ gameState: next });
  },

  executeAITurn: () => {
    const { gameState, aiStrategy, shuffleFn } = get();
    if (!gameState) {
      throw new Error('executeAITurn called with no gameState');
    }
    const turnFn =
      aiStrategy === 'bigMoneySmithy' ? bigMoneySmithyTurn : bigMoneyTurn;
    const next = turnFn(gameState, shuffleFn);
    // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う
    set({ gameState: next });
  },
}));
