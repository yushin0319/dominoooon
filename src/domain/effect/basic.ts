import type {
  GameState,
  CardInstance,
  ShuffleFn,
} from '../../types';
import {
  drawCards,
  discardCard,
  trashCardFromHand,
  gainCard,
} from '../player';
import { takeFromSupply } from '../supply';
import { getCurrentPlayer, updateCurrentPlayer, updatePlayer } from '../game';
import type { PendingEffectChoice } from './types';

// ===== Basic Card Effects =====

export function resolveCouncilRoom(state: GameState, shuffleFn: ShuffleFn): GameState {
  let result = state;
  for (let i = 0; i < result.players.length; i++) {
    if (i === state.currentPlayerIndex) continue;
    const updated = drawCards(result.players[i], 1, shuffleFn);
    result = updatePlayer(result, i, updated);
  }
  return result;
}

export function resolveMoneylender(state: GameState): GameState {
  const player = getCurrentPlayer(state);
  const copperIdx = player.hand.findIndex((c) => c.def.name === 'Copper');
  if (copperIdx === -1) return state;

  const [updatedPlayer, trashed] = trashCardFromHand(
    player,
    player.hand[copperIdx].instanceId,
  );
  let result = updateCurrentPlayer(state, updatedPlayer);
  result = { ...result, trash: [...result.trash, trashed] };
  result = {
    ...result,
    turnState: { ...result.turnState, coins: result.turnState.coins + 3 },
  };
  return result;
}

export function resolveLibrary(state: GameState, shuffleFn: ShuffleFn): GameState {
  const player = getCurrentPlayer(state);
  const needed = 7 - player.hand.length;
  if (needed <= 0) return state;
  const updated = drawCards(player, needed, shuffleFn);
  return updateCurrentPlayer(state, updated);
}

export function resolvePoacherOrPending(
  state: GameState,
  card: CardInstance,
): GameState {
  const emptyPiles = state.supply.filter((p) => p.count === 0).length;
  if (emptyPiles === 0) return state;

  const player = getCurrentPlayer(state);
  if (player.hand.length === 0) return state;

  return {
    ...state,
    pendingEffect: {
      type: 'poacher',
      sourceCard: card.def,
      playerId: player.id,
      data: { discardCount: emptyPiles },
    },
  };
}

export function resolveHarbingerOrPending(
  state: GameState,
  card: CardInstance,
): GameState {
  const player = getCurrentPlayer(state);
  if (player.discard.length === 0) return state;

  return {
    ...state,
    pendingEffect: {
      type: 'harbinger',
      sourceCard: card.def,
      playerId: player.id,
    },
  };
}

export function resolveCellar(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn,
): GameState {
  const selected = choice.selectedCards || [];
  let player = getCurrentPlayer(state);

  // Validate: all selected cards must exist in hand
  const validCards = selected.filter((id) =>
    player.hand.some((c) => c.instanceId === id),
  );
  if (validCards.length !== selected.length) {
    console.warn('Cellar: some selected cards not found in hand');
  }

  for (const id of validCards) {
    player = discardCard(player, id);
  }
  player = drawCards(player, validCards.length, shuffleFn);
  return { ...updateCurrentPlayer(state, player), pendingEffect: null };
}

export function resolveChapel(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const selected = choice.selectedCards || [];

  // Validate: max 4 cards
  if (selected.length > 4) {
    console.warn('Chapel: max 4 cards allowed, ignoring excess');
  }
  const validSelected = selected.slice(0, 4);

  let player = getCurrentPlayer(state);

  // Validate: all selected cards must exist in hand
  const existingCards = validSelected.filter((id) =>
    player.hand.some((c) => c.instanceId === id),
  );
  if (existingCards.length !== validSelected.length) {
    console.warn('Chapel: some selected cards not found in hand');
  }

  let trash = [...state.trash];
  for (const id of existingCards) {
    const [updated, trashed] = trashCardFromHand(player, id);
    player = updated;
    trash.push(trashed);
  }
  return { ...updateCurrentPlayer(state, player), trash, pendingEffect: null };
}

export function resolveWorkshop(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  if (!choice.selectedCardName) return { ...state, pendingEffect: null };

  const [newSupply, cardDef] = takeFromSupply(
    state.supply,
    choice.selectedCardName,
  );

  // Validate: cost must be <= 4
  if (cardDef.cost > 4) {
    console.warn(`Workshop: card cost must be <= 4, got ${cardDef.cost}`);
    return { ...state, pendingEffect: null };
  }

  const player = getCurrentPlayer(state);
  const updated = gainCard(player, cardDef);
  return {
    ...updateCurrentPlayer(state, updated),
    supply: newSupply,
    pendingEffect: null,
  };
}

export function resolvePoacher(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const selected = choice.selectedCards || [];
  const data = state.pendingEffect!.data || {};
  const needed = (data.discardCount as number) || 0;

  // Validate: must have at least 'needed' cards
  if (selected.length < needed) {
    console.warn(`Poacher: must discard ${needed} cards, got ${selected.length}`);
    return { ...state, pendingEffect: null };
  }

  let player = getCurrentPlayer(state);
  const toDiscard = selected.slice(0, needed);

  // Validate: all cards must exist in hand
  const validCards = toDiscard.filter((id) =>
    player.hand.some((c) => c.instanceId === id),
  );
  if (validCards.length !== toDiscard.length) {
    console.warn('Poacher: some selected cards not found in hand');
  }

  for (const id of validCards) {
    player = discardCard(player, id);
  }
  return { ...updateCurrentPlayer(state, player), pendingEffect: null };
}

export function resolveHarbinger(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const selected = choice.selectedCards || [];
  if (selected.length === 0) return { ...state, pendingEffect: null };

  const player = getCurrentPlayer(state);
  const cardId = selected[0];
  const cardIdx = player.discard.findIndex((c) => c.instanceId === cardId);
  if (cardIdx === -1) return { ...state, pendingEffect: null };

  const card = player.discard[cardIdx];
  const newDiscard = [...player.discard];
  newDiscard.splice(cardIdx, 1);
  const updated = {
    ...player,
    discard: newDiscard,
    deck: [card, ...player.deck],
  };
  return { ...updateCurrentPlayer(state, updated), pendingEffect: null };
}
