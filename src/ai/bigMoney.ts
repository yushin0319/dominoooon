import { GameState, Phase, ShuffleFn } from '../types';
import { advancePhase, buyCard, canBuy } from '../domain/turn';
import { endTurn } from '../domain/game';
import { getSupplyPile } from '../domain/supply';
import { createShuffleFn } from '../domain/shuffle';

const defaultShuffle = createShuffleFn();

/**
 * Determine what to buy based on Big Money priority.
 * Returns card name or null if nothing to buy.
 */
function chooseBuy(state: GameState): string | null {
  if (state.turnState.buys <= 0) return null;
  const coins = state.turnState.coins;

  const candidates: { name: string; minCoins: number }[] = [
    { name: 'Province', minCoins: 8 },
    { name: 'Gold', minCoins: 6 },
    { name: 'Silver', minCoins: 3 },
  ];

  for (const { name, minCoins } of candidates) {
    if (coins >= minCoins) {
      const pile = getSupplyPile(state.supply, name);
      if (pile && pile.count > 0) return name;
    }
  }

  return null;
}

/**
 * Action phase: skip (Big Money doesn't play actions).
 */
export function bigMoneyAction(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (state.phase !== Phase.Action) return state;
  return advancePhase(state, shuffleFn);
}

/**
 * Buy phase: purchase cards by priority (Province > Gold > Silver).
 */
export function bigMoneyBuy(state: GameState): GameState {
  let current = state;

  while (current.turnState.buys > 0) {
    const cardName = chooseBuy(current);
    if (!cardName) break;
    current = buyCard(current, cardName);
  }

  return current;
}

/**
 * Execute a full Big Money turn: action → buy → end turn.
 */
export function bigMoneyTurn(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  let current = bigMoneyAction(state, shuffleFn);
  current = bigMoneyBuy(current);
  current = endTurn(current, shuffleFn);
  return current;
}

/**
 * Return the next decision for UI display purposes.
 */
export function bigMoneyDecision(
  state: GameState,
): { action: 'skip' | 'buy'; cardName?: string } {
  if (state.phase === Phase.Action) {
    return { action: 'skip' };
  }

  if (state.phase === Phase.Buy) {
    const cardName = chooseBuy(state);
    if (cardName) return { action: 'buy', cardName };
  }

  return { action: 'skip' };
}
