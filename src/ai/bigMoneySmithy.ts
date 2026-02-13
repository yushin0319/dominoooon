import type { GameState, PlayerState, ShuffleFn } from '../types';
import { Phase } from '../types';
import { addLog, getCurrentPlayer, endTurn } from '../domain/game';
import { playActionCard, buyCard, advancePhase, canBuy } from '../domain/turn';
import { getSupplyPile } from '../domain/supply';
import { getCardDef } from '../domain/card';
import { createShuffleFn } from '../domain/shuffle';
import { getAllCards } from '../domain/player';

const defaultShuffle = createShuffleFn();

/**
 * Count occurrences of a card by name across all of a player's zones.
 */
export function countCardInDeck(player: PlayerState, cardName: string): number {
  return getAllCards(player).filter((c) => c.def.name === cardName).length;
}

/**
 * Action phase: play Smithy if available, then advance to Buy phase.
 */
export function bigMoneySmithyAction(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  let s = state;

  if (s.phase === Phase.Action) {
    const player = getCurrentPlayer(s);
    const smithy = player.hand.find((c) => c.def.name === 'Smithy');

    if (smithy && s.turnState.actions > 0) {
      s = playActionCard(s, smithy.instanceId, shuffleFn);
      s = addLog(s, `AIが鍛冶屋をプレイ`);
    }

    // Advance to Buy phase (auto-plays treasures)
    s = advancePhase(s, shuffleFn);
  }

  return s;
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
 */
export function bigMoneySmithyBuy(state: GameState): GameState {
  let s = state;

  while (canBuy(s)) {
    const cardName = decideBuy(s);
    if (!cardName) break;
    s = buyCard(s, cardName);
    s = addLog(s, `AIが${getCardDef(cardName).nameJa}を購入`);
  }

  return s;
}

/**
 * Execute a full AI turn: action → buy → end turn.
 */
export function bigMoneySmithyTurn(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  let s = addLog(state, `--- ターン${state.turnNumber}: AIのターン ---`);
  s = bigMoneySmithyAction(s, shuffleFn);
  s = bigMoneySmithyBuy(s);
  s = endTurn(s, shuffleFn);
  return s;
}

/**
 * Return the next decision for UI display purposes.
 */
export function bigMoneySmithyDecision(
  state: GameState,
): { action: 'play' | 'skip' | 'buy'; cardName?: string; instanceId?: string } {
  if (state.phase === Phase.Action) {
    const player = getCurrentPlayer(state);
    const smithy = player.hand.find((c) => c.def.name === 'Smithy');
    if (smithy && state.turnState.actions > 0) {
      return { action: 'play', cardName: 'Smithy', instanceId: smithy.instanceId };
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
