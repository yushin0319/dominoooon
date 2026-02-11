import type {
  GameState,
  PlayerState,
  CardInstance,
  ShuffleFn,
} from '../types';
import { CardType } from '../types';
import { getCardDef } from './card';
import {
  drawCards,
  discardCard,
  trashCardFromHand,
  gainCard,
  gainCardToHand,
  gainCardToDeck,
} from './player';
import { takeFromSupply, getSupplyPile, getEmptyPileCount } from './supply';
import { getCurrentPlayer, updateCurrentPlayer, updatePlayer } from './game';
import { createShuffleFn } from './shuffle';

const defaultShuffle = createShuffleFn();

// ===== Types =====

export type PendingEffectChoice = {
  type: string;
  selectedCards?: string[];
  selectedCardName?: string;
  confirmed?: boolean;
};

// ===== Public API =====

export function hasMoatReaction(player: PlayerState): boolean {
  return player.hand.some((c) => c.def.name === 'Moat');
}

export function resolveCustomEffect(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  const custom = card.def.effects.custom;
  if (!custom) return state;

  switch (custom) {
    // Immediate resolvers
    case 'councilRoom':
      return resolveCouncilRoom(state, shuffleFn);
    case 'witch':
      return resolveWitch(state);
    case 'moneylender':
      return resolveMoneylender(state);
    case 'library':
      return resolveLibrary(state, shuffleFn);
    case 'bandit':
      return resolveBandit(state, shuffleFn);
    case 'bureaucrat':
      return resolveBureaucrat(state);
    // Merchant: basic effects (+1 card, +1 action) handled by applyBasicEffects.
    // TODO: Silver bonus (+1 coin on first Silver) to be handled in turn.ts autoPlayTreasures.
    case 'merchant':
      return state;
    case 'vassal':
      return resolveVassal(state, card, shuffleFn);
    case 'sentry':
      return resolveSentry(state, card, shuffleFn);
    // Conditional immediate/pending
    case 'poacher':
      return resolvePoacherOrPending(state, card);
    case 'harbinger':
      return resolveHarbingerOrPending(state, card);
    // PendingEffect creators
    case 'cellar':
      return createPending(state, 'cellar', card);
    case 'chapel':
      return createPending(state, 'chapel', card);
    case 'workshop':
      return createPending(state, 'workshop', card);
    case 'remodel':
      return createPendingWithData(state, 'remodel', card, { phase: 'trash' });
    case 'mine':
      return createMinePending(state, card);
    case 'artisan':
      return createPendingWithData(state, 'artisan', card, { phase: 'gain' });
    case 'militia':
      return resolveMilitia(state, card);
    case 'throneRoom':
      return createThroneRoomPending(state, card);
    default:
      return state;
  }
}

export function resolvePendingEffect(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (!state.pendingEffect) return state;

  switch (state.pendingEffect.type) {
    case 'cellar':
      return resolveCellar(state, choice, shuffleFn);
    case 'chapel':
      return resolveChapel(state, choice);
    case 'workshop':
      return resolveWorkshop(state, choice);
    case 'remodel':
      return resolveRemodel(state, choice);
    case 'mine':
      return resolveMine(state, choice);
    case 'artisan':
      return resolveArtisan(state, choice);
    case 'militia':
      return resolveMilitiaChoice(state, choice);
    case 'throneRoom':
      return resolveThroneRoom(state, choice, shuffleFn);
    case 'poacher':
      return resolvePoacher(state, choice);
    case 'harbinger':
      return resolveHarbinger(state, choice);
    case 'vassal':
      return resolveVassalChoice(state, choice, shuffleFn);
    case 'sentry':
      return resolveSentryChoice(state, choice);
    default:
      return { ...state, pendingEffect: null };
  }
}

// ===== Helpers =====

function getAttackTargets(state: GameState): number[] {
  return state.players
    .map((_, i) => i)
    .filter(
      (i) => i !== state.currentPlayerIndex && !hasMoatReaction(state.players[i]),
    );
}

function createPending(
  state: GameState,
  type: string,
  card: CardInstance,
): GameState {
  const player = getCurrentPlayer(state);
  if (player.hand.length === 0) return state;
  return {
    ...state,
    pendingEffect: {
      type,
      sourceCard: card.def,
      playerId: player.id,
    },
  };
}

function createPendingWithData(
  state: GameState,
  type: string,
  card: CardInstance,
  data: Record<string, unknown>,
): GameState {
  const player = getCurrentPlayer(state);
  if (type !== 'artisan' && player.hand.length === 0) return state;
  return {
    ...state,
    pendingEffect: {
      type,
      sourceCard: card.def,
      playerId: player.id,
      data,
    },
  };
}

// ===== Immediate Resolvers =====

function resolveCouncilRoom(state: GameState, shuffleFn: ShuffleFn): GameState {
  let result = state;
  for (let i = 0; i < result.players.length; i++) {
    if (i === state.currentPlayerIndex) continue;
    const updated = drawCards(result.players[i], 1, shuffleFn);
    result = updatePlayer(result, i, updated);
  }
  return result;
}

function resolveWitch(state: GameState): GameState {
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

function resolveMoneylender(state: GameState): GameState {
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

function resolveLibrary(state: GameState, shuffleFn: ShuffleFn): GameState {
  const player = getCurrentPlayer(state);
  const needed = 7 - player.hand.length;
  if (needed <= 0) return state;
  const updated = drawCards(player, needed, shuffleFn);
  return updateCurrentPlayer(state, updated);
}

function resolveBandit(state: GameState, shuffleFn: ShuffleFn): GameState {
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

function resolveBureaucrat(state: GameState): GameState {
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

function resolveVassal(
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

function resolveSentry(
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

function resolvePoacherOrPending(
  state: GameState,
  card: CardInstance,
): GameState {
  const emptyPiles = getEmptyPileCount(state.supply);
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

function resolveHarbingerOrPending(
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

function createMinePending(state: GameState, card: CardInstance): GameState {
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

function resolveMilitia(state: GameState, card: CardInstance): GameState {
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

function createThroneRoomPending(
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

function resolveCellar(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn,
): GameState {
  const selected = choice.selectedCards || [];
  let player = getCurrentPlayer(state);
  for (const id of selected) {
    player = discardCard(player, id);
  }
  player = drawCards(player, selected.length, shuffleFn);
  return { ...updateCurrentPlayer(state, player), pendingEffect: null };
}

function resolveChapel(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const selected = (choice.selectedCards || []).slice(0, 4);
  let player = getCurrentPlayer(state);
  let trash = [...state.trash];
  for (const id of selected) {
    const [updated, trashed] = trashCardFromHand(player, id);
    player = updated;
    trash.push(trashed);
  }
  return { ...updateCurrentPlayer(state, player), trash, pendingEffect: null };
}

function resolveWorkshop(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  if (!choice.selectedCardName) return { ...state, pendingEffect: null };
  const [newSupply, cardDef] = takeFromSupply(
    state.supply,
    choice.selectedCardName,
  );
  if (cardDef.cost > 4) {
    throw new Error(`Workshop: card cost must be <= 4, got ${cardDef.cost}`);
  }
  const player = getCurrentPlayer(state);
  const updated = gainCard(player, cardDef);
  return {
    ...updateCurrentPlayer(state, updated),
    supply: newSupply,
    pendingEffect: null,
  };
}

function resolveRemodel(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};

  if (data.phase === 'trash') {
    if (!choice.selectedCards || choice.selectedCards.length === 0) {
      return { ...state, pendingEffect: null };
    }
    const player = getCurrentPlayer(state);
    const [updated, trashed] = trashCardFromHand(player, choice.selectedCards[0]);
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
    if (cardDef.cost > maxCost) {
      throw new Error(`Remodel: card cost must be <= ${maxCost}`);
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

function resolveMine(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};

  if (data.phase === 'trash') {
    if (!choice.selectedCards || choice.selectedCards.length === 0) {
      return { ...state, pendingEffect: null };
    }
    const player = getCurrentPlayer(state);
    const [updated, trashed] = trashCardFromHand(player, choice.selectedCards[0]);
    if (!trashed.def.types.includes(CardType.Treasure)) {
      throw new Error('Mine: must trash a Treasure card');
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
    if (cardDef.cost > maxCost) {
      throw new Error(`Mine: card cost must be <= ${maxCost}`);
    }
    if (!cardDef.types.includes(CardType.Treasure)) {
      throw new Error('Mine: must gain a Treasure card');
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

function resolveArtisan(
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
    if (cardDef.cost > 5) {
      throw new Error('Artisan: card cost must be <= 5');
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
    if (idx === -1) throw new Error('Artisan: card not found in hand');
    const card = player.hand[idx];
    const newHand = [...player.hand];
    newHand.splice(idx, 1);
    const updated = { ...player, hand: newHand, deck: [card, ...player.deck] };
    return { ...updateCurrentPlayer(state, updated), pendingEffect: null };
  }

  return { ...state, pendingEffect: null };
}

function resolveMilitiaChoice(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const data = state.pendingEffect!.data || {};
  const targetIndices = data.targetIndices as number[];
  const currentTargetIdx = data.currentTargetIdx as number;
  const playerIdx = targetIndices[currentTargetIdx];
  let player = state.players[playerIdx];

  const selected = choice.selectedCards || [];
  for (const id of selected) {
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

function resolveThroneRoom(
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

function resolvePoacher(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  const selected = choice.selectedCards || [];
  let player = getCurrentPlayer(state);
  for (const id of selected) {
    player = discardCard(player, id);
  }
  return { ...updateCurrentPlayer(state, player), pendingEffect: null };
}

function resolveHarbinger(
  state: GameState,
  choice: PendingEffectChoice,
): GameState {
  if (!choice.selectedCards || choice.selectedCards.length === 0) {
    return { ...state, pendingEffect: null };
  }
  const player = getCurrentPlayer(state);
  const cardId = choice.selectedCards[0];
  const idx = player.discard.findIndex((c) => c.instanceId === cardId);
  if (idx === -1) return { ...state, pendingEffect: null };

  const card = player.discard[idx];
  const newDiscard = [...player.discard];
  newDiscard.splice(idx, 1);
  const updated = {
    ...player,
    discard: newDiscard,
    deck: [card, ...player.deck],
  };
  return { ...updateCurrentPlayer(state, updated), pendingEffect: null };
}

function resolveVassalChoice(
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

function resolveSentryChoice(
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
