import type {
  GameState,
  CardInstance,
  ShuffleFn,
} from '../../types';
import { CardType } from '../../types';
import { getCardDef } from '../card';
import {
  drawCards,
  discardCard,
  trashCardFromHand,
  gainCard,
  gainCardToHand,
  gainCardToDeck,
} from '../player';
import { takeFromSupply } from '../supply';
import { getCurrentPlayer, updateCurrentPlayer } from '../game';
import type { PendingEffectChoice } from './types';
import { resolveCustomEffect } from './index';

// ===== Complex Card Effects =====

export function resolveVassal(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn,
): GameState {
  let player = getCurrentPlayer(state);

  // If deck empty, reshuffle
  if (player.deck.length === 0 && player.discard.length > 0) {
    const reshuffled = shuffleFn(player.discard);
    player = { ...player, deck: reshuffled, discard: [] };
  }

  if (player.deck.length === 0) return updateCurrentPlayer(state, player);

  const topCard = player.deck[0];
  const newDeck = player.deck.slice(1);
  player = { ...player, deck: newDeck, discard: [...player.discard, topCard] };
  const result = updateCurrentPlayer(state, player);

  if (topCard.def.types.includes(CardType.Action)) {
    return {
      ...result,
      pendingEffect: {
        type: 'vassal',
        sourceCard: card.def,
        playerId: player.id,
        data: { revealedCardId: topCard.instanceId },
      },
    };
  }

  return result;
}

export function resolveSentry(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn,
): GameState {
  let player = getCurrentPlayer(state);

  // If deck has fewer than 2, reshuffle
  if (player.deck.length < 2 && player.discard.length > 0) {
    const reshuffled = shuffleFn(player.discard);
    player = { ...player, deck: [...player.deck, ...reshuffled], discard: [] };
  }

  const revealCount = Math.min(2, player.deck.length);
  if (revealCount === 0) return updateCurrentPlayer(state, player);

  const revealed = player.deck.slice(0, revealCount);
  const newDeck = player.deck.slice(revealCount);
  player = { ...player, deck: newDeck };
  const result = updateCurrentPlayer(state, player);

  return {
    ...result,
    pendingEffect: {
      type: 'sentry',
      sourceCard: card.def,
      playerId: player.id,
      data: {
        revealedCards: revealed.map((c) => ({
          instanceId: c.instanceId,
          defName: c.def.name,
        })),
      },
    },
  };
}

export function createMinePending(state: GameState, card: CardInstance): GameState {
  const player = getCurrentPlayer(state);
  const hasTreasure = player.hand.some((c) =>
    c.def.types.includes(CardType.Treasure),
  );
  if (!hasTreasure) return state;
  return {
    ...state,
    pendingEffect: {
      type: 'mine',
      sourceCard: card.def,
      playerId: player.id,
      data: { phase: 'trash' },
    },
  };
}

export function createThroneRoomPending(
  state: GameState,
  card: CardInstance,
): GameState {
  const player = getCurrentPlayer(state);
  const hasAction = player.hand.some((c) =>
    c.def.types.includes(CardType.Action),
  );
  if (!hasAction) return state;
  return {
    ...state,
    pendingEffect: {
      type: 'throneRoom',
      sourceCard: card.def,
      playerId: player.id,
    },
  };
}

// ===== PendingEffect Resolvers =====

export function resolveRemodel(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};

  if (data.phase === 'trash') {
    if (!choice.selectedCards || choice.selectedCards.length === 0) {
      return { ...state, pendingEffect: null };
    }

    const player = getCurrentPlayer(state);
    const cardId = choice.selectedCards[0];

    // Validate: card must exist in hand
    if (!player.hand.some((c) => c.instanceId === cardId)) {
      console.warn('Remodel: selected card not found in hand');
      return { ...state, pendingEffect: null };
    }

    const [updated, trashed] = trashCardFromHand(player, cardId);
    const result = {
      ...updateCurrentPlayer(state, updated),
      trash: [...state.trash, trashed],
    };
    return {
      ...result,
      pendingEffect: {
        ...state.pendingEffect!,
        data: { phase: 'gain', trashedCost: trashed.def.cost },
      },
    };
  }

  if (data.phase === 'gain') {
    if (!choice.selectedCardName) return { ...state, pendingEffect: null };
    const maxCost = (data.trashedCost as number) + 2;
    const [newSupply, cardDef] = takeFromSupply(
      state.supply,
      choice.selectedCardName,
    );

    // Validate: cost constraint
    if (cardDef.cost > maxCost) {
      console.warn(`Remodel: card cost must be <= ${maxCost}, got ${cardDef.cost}`);
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

  return { ...state, pendingEffect: null };
}

export function resolveMine(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};

  if (data.phase === 'trash') {
    if (!choice.selectedCards || choice.selectedCards.length === 0) {
      return { ...state, pendingEffect: null };
    }

    const player = getCurrentPlayer(state);
    const cardId = choice.selectedCards[0];

    // Validate: card must exist in hand
    if (!player.hand.some((c) => c.instanceId === cardId)) {
      console.warn('Mine: selected card not found in hand');
      return { ...state, pendingEffect: null };
    }

    const [updated, trashed] = trashCardFromHand(player, cardId);

    // Validate: must be a Treasure card
    if (!trashed.def.types.includes(CardType.Treasure)) {
      console.warn('Mine: must trash a Treasure card');
      return { ...state, pendingEffect: null };
    }

    const result = {
      ...updateCurrentPlayer(state, updated),
      trash: [...state.trash, trashed],
    };
    return {
      ...result,
      pendingEffect: {
        ...state.pendingEffect!,
        data: { phase: 'gain', trashedCost: trashed.def.cost },
      },
    };
  }

  if (data.phase === 'gain') {
    if (!choice.selectedCardName) return { ...state, pendingEffect: null };
    const maxCost = (data.trashedCost as number) + 3;
    const [newSupply, cardDef] = takeFromSupply(
      state.supply,
      choice.selectedCardName,
    );

    // Validate: cost constraint
    if (cardDef.cost > maxCost) {
      console.warn(`Mine: card cost must be <= ${maxCost}, got ${cardDef.cost}`);
      return { ...state, pendingEffect: null };
    }

    // Validate: must be a Treasure card
    if (!cardDef.types.includes(CardType.Treasure)) {
      console.warn('Mine: must gain a Treasure card');
      return { ...state, pendingEffect: null };
    }

    const player = getCurrentPlayer(state);
    const updated = gainCardToHand(player, cardDef);
    return {
      ...updateCurrentPlayer(state, updated),
      supply: newSupply,
      pendingEffect: null,
    };
  }

  return { ...state, pendingEffect: null };
}

export function resolveArtisan(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};

  if (data.phase === 'gain') {
    if (!choice.selectedCardName) return { ...state, pendingEffect: null };
    const [newSupply, cardDef] = takeFromSupply(
      state.supply,
      choice.selectedCardName,
    );

    // Validate: cost constraint
    if (cardDef.cost > 5) {
      console.warn(`Artisan: card cost must be <= 5, got ${cardDef.cost}`);
      return { ...state, pendingEffect: null };
    }

    const player = getCurrentPlayer(state);
    const updated = gainCardToHand(player, cardDef);
    const result = {
      ...updateCurrentPlayer(state, updated),
      supply: newSupply,
    };
    return {
      ...result,
      pendingEffect: {
        ...state.pendingEffect!,
        data: { phase: 'putBack' },
      },
    };
  }

  if (data.phase === 'putBack') {
    if (!choice.selectedCards || choice.selectedCards.length === 0) {
      return { ...state, pendingEffect: null };
    }
    const player = getCurrentPlayer(state);
    const cardId = choice.selectedCards[0];
    const idx = player.hand.findIndex((c) => c.instanceId === cardId);

    // Validate: card must exist in hand
    if (idx === -1) {
      console.warn('Artisan: card not found in hand');
      return { ...state, pendingEffect: null };
    }

    const card = player.hand[idx];
    const newHand = [...player.hand];
    newHand.splice(idx, 1);
    const updated = { ...player, hand: newHand, deck: [card, ...player.deck] };
    return { ...updateCurrentPlayer(state, updated), pendingEffect: null };
  }

  return { ...state, pendingEffect: null };
}

export function resolveThroneRoom(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn,
): GameState {
  if (!choice.selectedCards || choice.selectedCards.length === 0) {
    return { ...state, pendingEffect: null };
  }

  const cardId = choice.selectedCards[0];
  const player = getCurrentPlayer(state);
  const card = player.hand.find((c) => c.instanceId === cardId);
  if (!card || !card.def.types.includes(CardType.Action)) {
    throw new Error('Throne Room: must select an Action card');
  }

  // Move card to playArea (only once)
  const idx = player.hand.findIndex((c) => c.instanceId === cardId);
  const newHand = [...player.hand];
  newHand.splice(idx, 1);
  const played = {
    ...player,
    hand: newHand,
    playArea: [...player.playArea, card],
  };

  let result = updateCurrentPlayer(state, played);
  result = { ...result, pendingEffect: null };

  // Apply effects twice
  for (let i = 0; i < 2; i++) {
    const { effects } = card.def;
    if (effects.cards && effects.cards > 0) {
      const cur = getCurrentPlayer(result);
      const drawn = drawCards(cur, effects.cards, shuffleFn);
      result = updateCurrentPlayer(result, drawn);
    }
    if (effects.actions) {
      result = {
        ...result,
        turnState: {
          ...result.turnState,
          actions: result.turnState.actions + effects.actions,
        },
      };
    }
    if (effects.buys) {
      result = {
        ...result,
        turnState: {
          ...result.turnState,
          buys: result.turnState.buys + effects.buys,
        },
      };
    }
    if (effects.coins) {
      result = {
        ...result,
        turnState: {
          ...result.turnState,
          coins: result.turnState.coins + effects.coins,
        },
      };
    }

    // Apply custom effect
    if (effects.custom) {
      result = resolveCustomEffect(result, card, shuffleFn);
      // If a pendingEffect was created, stop and let the caller handle it
      if (result.pendingEffect) break;
    }
  }

  return result;
}

export function resolveVassalChoice(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn,
): GameState {
  const data = state.pendingEffect!.data || {};
  const cardId = data.revealedCardId as string;

  if (!choice.confirmed) {
    return { ...state, pendingEffect: null };
  }

  // Play the Action card from discard
  let player = getCurrentPlayer(state);
  const idx = player.discard.findIndex((c) => c.instanceId === cardId);
  if (idx === -1) return { ...state, pendingEffect: null };

  const card = player.discard[idx];
  const newDiscard = [...player.discard];
  newDiscard.splice(idx, 1);
  const updated = {
    ...player,
    discard: newDiscard,
    playArea: [...player.playArea, card],
  };

  let result = updateCurrentPlayer(state, updated);
  result = { ...result, pendingEffect: null };

  // Apply basic effects
  const { effects } = card.def;
  if (effects.cards && effects.cards > 0) {
    const cur = getCurrentPlayer(result);
    const drawn = drawCards(cur, effects.cards, shuffleFn);
    result = updateCurrentPlayer(result, drawn);
  }
  if (effects.actions) {
    result = {
      ...result,
      turnState: {
        ...result.turnState,
        actions: result.turnState.actions + effects.actions,
      },
    };
  }
  if (effects.buys) {
    result = {
      ...result,
      turnState: {
        ...result.turnState,
        buys: result.turnState.buys + effects.buys,
      },
    };
  }
  if (effects.coins) {
    result = {
      ...result,
      turnState: {
        ...result.turnState,
        coins: result.turnState.coins + effects.coins,
      },
    };
  }

  // Apply custom effect
  if (effects.custom) {
    result = resolveCustomEffect(result, card, shuffleFn);
  }

  return result;
}

export function resolveSentryChoice(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};
  const revealedCards = (data.revealedCards || []) as Array<{
    instanceId: string;
    defName: string;
  }>;
  const trashIds = new Set(choice.selectedCards || []);

  let player = getCurrentPlayer(state);
  let trash = [...state.trash];
  const putBack: CardInstance[] = [];

  for (const rc of revealedCards) {
    const cardDef = getCardDef(rc.defName);
    const card: CardInstance = { instanceId: rc.instanceId, def: cardDef };
    if (trashIds.has(rc.instanceId)) {
      trash.push(card);
    } else {
      putBack.push(card);
    }
  }

  // Put back cards go on top of deck
  const updated = { ...player, deck: [...putBack, ...player.deck] };

  return {
    ...updateCurrentPlayer(state, updated),
    trash,
    pendingEffect: null,
  };
}
