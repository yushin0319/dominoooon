import { getCurrentPlayer } from '../domain/game';
import { getAllCards } from '../domain/player';
import { createShuffleFn } from '../domain/shuffle';
import { getSupplyPile } from '../domain/supply';
import { advancePhase, buyCard, canBuy, playActionCard } from '../domain/turn';
import type { GameState, PlayerState, ShuffleFn } from '../types';
import { Phase } from '../types';
import { type AITurnStrategy, planAITurn } from './aiTurn';

const defaultShuffle = createShuffleFn();

/**
 * Count occurrences of a card by name across all of a player's zones.
 */
export function countCardInDeck(player: PlayerState, cardName: string): number {
  return getAllCards(player).filter((c) => c.def.name === cardName).length;
}

/**
 * アクションフェーズ: 手札に鍛冶屋があれば使う（フェーズは進めない）
 */
export function playSmithyIfInHand(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (state.phase !== Phase.Action || state.turnState.actions <= 0) {
    return state;
  }
  const smithy = getCurrentPlayer(state).hand.find(
    (c) => c.def.name === 'Smithy',
  );
  return smithy ? playActionCard(state, smithy.instanceId, shuffleFn) : state;
}

/**
 * Action phase: play Smithy if available, then advance to Buy phase.
 */
export function bigMoneySmithyAction(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (state.phase !== Phase.Action) return state;
  // Advance to Buy phase (auto-plays treasures)
  return advancePhase(playSmithyIfInHand(state, shuffleFn), shuffleFn);
}

/**
 * Determine the best card to buy given the Big Money + Smithy strategy.
 * Returns the card name or null if nothing should be bought.
 */
function decideBuy(state: GameState): string | null {
  const { coins } = state.turnState;
  const player = getCurrentPlayer(state);

  if (coins >= 8 && getSupplyPile(state.supply, 'Province')?.count) {
    return 'Province';
  }
  if (coins >= 6 && getSupplyPile(state.supply, 'Gold')?.count) {
    return 'Gold';
  }
  if (
    coins >= 4 &&
    countCardInDeck(player, 'Smithy') < 2 &&
    (getSupplyPile(state.supply, 'Smithy')?.count ?? 0) > 0
  ) {
    return 'Smithy';
  }
  if (coins >= 3 && getSupplyPile(state.supply, 'Silver')?.count) {
    return 'Silver';
  }
  return null;
}

/**
 * Buy phase: purchase cards according to Big Money + Smithy priority.
 * ログは書かない（何を買ったかは planAITurn がまとめの 1 行で残す）
 */
export function bigMoneySmithyBuy(state: GameState): GameState {
  let s = state;

  while (canBuy(s)) {
    const cardName = decideBuy(s);
    if (!cardName) break;
    s = buyCard(s, cardName);
  }

  return s;
}

/** 段階に分けて見せるための戦略 */
export const bigMoneySmithyStrategy: AITurnStrategy = {
  playActions: playSmithyIfInHand,
  buy: bigMoneySmithyBuy,
};

/**
 * Execute a full AI turn: action → buy → end turn.
 */
export function bigMoneySmithyTurn(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  return planAITurn(state, bigMoneySmithyStrategy, shuffleFn).final;
}

/**
 * Return the next decision for UI display purposes.
 */
export function bigMoneySmithyDecision(state: GameState): {
  action: 'play' | 'skip' | 'buy';
  cardName?: string;
  instanceId?: string;
} {
  if (state.phase === Phase.Action) {
    const player = getCurrentPlayer(state);
    const smithy = player.hand.find((c) => c.def.name === 'Smithy');
    if (smithy && state.turnState.actions > 0) {
      return {
        action: 'play',
        cardName: 'Smithy',
        instanceId: smithy.instanceId,
      };
    }
    return { action: 'skip' };
  }

  if (state.phase === Phase.Buy && canBuy(state)) {
    const cardName = decideBuy(state);
    if (cardName) {
      return { action: 'buy', cardName };
    }
  }

  return { action: 'skip' };
}
