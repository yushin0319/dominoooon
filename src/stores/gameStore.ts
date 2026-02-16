import { create } from 'zustand';
import type { GameState, CardDef, ShuffleFn } from '../types';
import { createGame, endTurn, addLog } from '../domain/game';
import { playActionCard, buyCard as turnBuyCard, advancePhase } from '../domain/turn';
import { resolvePendingEffect } from '../domain/effect';
import type { PendingEffectChoice } from '../domain/effect';
import { bigMoneyTurn } from '../ai/bigMoney';
import { bigMoneySmithyTurn } from '../ai/bigMoneySmithy';
import { createShuffleFn } from '../domain/shuffle';

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
    const player = gameState.players[gameState.currentPlayerIndex];
    const card = player.hand.find((c) => c.instanceId === instanceId);
    if (!card) {
      console.warn('playAction: card not found');
      return;
    }
    const cardName = card.def.nameJa ?? card.def.name;
    const effects = card.def.effects;
    let effectText = '';
    const parts: string[] = [];
    if (effects.cards && effects.cards > 0) parts.push(`+${effects.cards}枚ドロー`);
    if (effects.actions && effects.actions > 0) parts.push(`+${effects.actions}アクション`);
    if (effects.buys && effects.buys > 0) parts.push(`+${effects.buys}購入`);
    if (effects.coins && effects.coins > 0) parts.push(`+${effects.coins}コイン`);
    if (effects.custom) parts.push('特殊効果');
    if (parts.length > 0) effectText = `（${parts.join('、')}）`;

    const withLog = addLog(gameState, `あなたは${cardName}をプレイしました${effectText}`);
    const next = playActionCard(withLog, instanceId, shuffleFn);
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
    const supplyEntry = gameState.supply.find((s) => s.card.name === cardName);
    const displayName = supplyEntry?.card.nameJa ?? cardName;
    const withLog = addLog(gameState, `あなたは${displayName}を購入しました`);
    const next = turnBuyCard(withLog, cardName);
    set({ gameState: next });
  },

  skipBuy: () => {
    const { gameState, shuffleFn } = get();
    if (!gameState) {
      console.warn('skipBuy called with no gameState');
      return;
    }
    const next = endTurn(gameState, shuffleFn);
    // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う
    set({ gameState: next });
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
    // GamePage.tsx の useEffect が gameOver 検知してページ遷移を行う
    set({ gameState: next });
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
