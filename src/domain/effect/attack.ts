import type {
  GameState,
  PlayerState,
  CardInstance,
  ShuffleFn,
} from '../../types';
import { CardType } from '../../types';
import {
  discardCard,
  gainCard,
  gainCardToDeck,
} from '../player';
import { takeFromSupply, getSupplyPile } from '../supply';
import { getCurrentPlayer, updateCurrentPlayer, updatePlayer } from '../game';
import type { PendingEffectChoice } from './types';

// ===== Attack Card Effects =====

export function hasMoatReaction(player: PlayerState): boolean {
  return player.hand.some((c) => c.def.name === 'Moat');
}

function getAttackTargets(state: GameState): number[] {
  return state.players
    .map((_, i) => i)
    .filter(
      (i) => i !== state.currentPlayerIndex && !hasMoatReaction(state.players[i]),
    );
}

export function resolveWitch(state: GameState): GameState {
  let result = state;
  for (const i of getAttackTargets(state)) {
    const cursePile = getSupplyPile(result.supply, 'Curse');
    if (!cursePile || cursePile.count <= 0) break;
    const [newSupply, curseDef] = takeFromSupply(result.supply, 'Curse');
    result = { ...result, supply: newSupply };
    const updated = gainCard(result.players[i], curseDef);
    result = updatePlayer(result, i, updated);
  }
  return result;
}
export function resolveBandit(state: GameState, shuffleFn: ShuffleFn): GameState {
  let result = state;

  // Gain Gold
  const goldPile = getSupplyPile(result.supply, 'Gold');
  if (goldPile && goldPile.count > 0) {
    const [newSupply, goldDef] = takeFromSupply(result.supply, 'Gold');
    result = { ...result, supply: newSupply };
    const player = getCurrentPlayer(result);
    const updated = gainCard(player, goldDef);
    result = updateCurrentPlayer(result, updated);
  }

  // Attack targets
  for (const i of getAttackTargets(result)) {
    let target = result.players[i];

    // Ensure at least 2 cards to reveal (reshuffle if needed)
    if (target.deck.length < 2 && target.discard.length > 0) {
      const reshuffled = shuffleFn(target.discard);
      target = { ...target, deck: [...target.deck, ...reshuffled], discard: [] };
    }

    const revealCount = Math.min(2, target.deck.length);
    if (revealCount === 0) {
      result = updatePlayer(result, i, target);
      continue;
    }

    const revealed = target.deck.slice(0, revealCount);
    const remainingDeck = target.deck.slice(revealCount);

    // Find non-Copper Treasures
    const trashable = revealed.filter(
      (c) => c.def.types.includes(CardType.Treasure) && c.def.name !== 'Copper',
    );
    const nonTrashable = revealed.filter(
      (c) => !c.def.types.includes(CardType.Treasure) || c.def.name === 'Copper',
    );

    if (trashable.length > 0) {
      // Trash the most expensive one
      trashable.sort((a, b) => b.def.cost - a.def.cost);
      result = { ...result, trash: [...result.trash, trashable[0]] };
      const otherTreasures = trashable.slice(1);
      target = {
        ...target,
        deck: remainingDeck,
        discard: [...target.discard, ...nonTrashable, ...otherTreasures],
      };
    } else {
      target = {
        ...target,
        deck: remainingDeck,
        discard: [...target.discard, ...revealed],
      };
    }

    result = updatePlayer(result, i, target);
  }

  return result;
}

export function resolveBureaucrat(state: GameState): GameState {
  let result = state;

  // Gain Silver to deck top
  const silverPile = getSupplyPile(result.supply, 'Silver');
  if (silverPile && silverPile.count > 0) {
    const [newSupply, silverDef] = takeFromSupply(result.supply, 'Silver');
    result = { ...result, supply: newSupply };
    const player = getCurrentPlayer(result);
    const updated = gainCardToDeck(player, silverDef);
    result = updateCurrentPlayer(result, updated);
  }

  // Attack targets: put Victory on deck top
  for (const i of getAttackTargets(result)) {
    const target = result.players[i];
    const victoryIdx = target.hand.findIndex((c) =>
      c.def.types.includes(CardType.Victory),
    );
    if (victoryIdx !== -1) {
      const card = target.hand[victoryIdx];
      const newHand = [...target.hand];
      newHand.splice(victoryIdx, 1);
      const updated = {
        ...target,
        hand: newHand,
        deck: [card, ...target.deck],
      };
      result = updatePlayer(result, i, updated);
    }
  }

  return result;
}

export function resolveMilitia(state: GameState, card: CardInstance): GameState {
  const targets = getAttackTargets(state);
  const needsDiscard = targets.filter((i) => state.players[i].hand.length > 3);
  if (needsDiscard.length === 0) return state;
  return {
    ...state,
    pendingEffect: {
      type: 'militia',
      sourceCard: card.def,
      playerId: state.players[needsDiscard[0]].id,
      data: { targetIndices: needsDiscard, currentTargetIdx: 0 },
    },
  };
}

export function resolveMilitiaChoice(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};
  const targetIndices = data.targetIndices as number[];
  const currentTargetIdx = data.currentTargetIdx as number;
  const playerIdx = targetIndices[currentTargetIdx];
  let player = state.players[playerIdx];

  const selected = choice.selectedCards || [];

  // Validate: after discarding, hand should have at most 3 cards
  const finalHandSize = player.hand.length - selected.length;
  if (finalHandSize > 3) {
    console.warn(
      `Militia: player must discard down to 3 cards (current: ${player.hand.length}, selected: ${selected.length})`,
    );
    return state;
  }

  // Validate: all selected cards must exist in hand
  const validCards = selected.filter((id) =>
    player.hand.some((c) => c.instanceId === id),
  );
  if (validCards.length !== selected.length) {
    console.warn('Militia: some selected cards not found in hand');
  }

  for (const id of validCards) {
    player = discardCard(player, id);
  }

  let result = updatePlayer(state, playerIdx, player);

  // Check for more targets
  const nextIdx = currentTargetIdx + 1;
  if (nextIdx < targetIndices.length) {
    const nextPlayerIdx = targetIndices[nextIdx];
    if (result.players[nextPlayerIdx].hand.length > 3) {
      return {
        ...result,
        pendingEffect: {
          ...state.pendingEffect!,
          playerId: result.players[nextPlayerIdx].id,
          data: { ...data, currentTargetIdx: nextIdx },
        },
      };
    }
  }

  return { ...result, pendingEffect: null };
}

