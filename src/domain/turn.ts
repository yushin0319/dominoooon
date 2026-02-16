import type { GameState, TurnState, CardInstance, ShuffleFn } from '../types';
import { Phase, CardType } from '../types';
import { drawCards, playCard, discardHand, discardPlayArea, gainCard } from './player';
import { takeFromSupply } from './supply';
import { resolveCustomEffect } from './effect';
import { createShuffleFn } from './shuffle';
import { getCardDef } from './card';

const defaultShuffle = createShuffleFn();

export function createInitialTurnState(): TurnState {
  return { actions: 1, buys: 1, coins: 0 };
}

export function applyBasicEffects(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  const { effects } = card.def;
  let turnState = { ...state.turnState };
  let players = [...state.players];
  let currentPlayer = players[state.currentPlayerIndex];

  if (effects.cards && effects.cards > 0) {
    currentPlayer = drawCards(currentPlayer, effects.cards, shuffleFn);
  }
  if (effects.actions) {
    turnState = { ...turnState, actions: turnState.actions + effects.actions };
  }
  if (effects.buys) {
    turnState = { ...turnState, buys: turnState.buys + effects.buys };
  }
  if (effects.coins) {
    turnState = { ...turnState, coins: turnState.coins + effects.coins };
  }

  players = players.map((p, i) =>
    i === state.currentPlayerIndex ? currentPlayer : p,
  );

  return { ...state, players, turnState };
}

export function canPlayAction(state: GameState): boolean {
  if (state.phase !== Phase.Action || state.turnState.actions <= 0) {
    return false;
  }
  const currentPlayer = state.players[state.currentPlayerIndex];
  return currentPlayer.hand.some((c) =>
    c.def.types.includes(CardType.Action),
  );
}

export function playActionCard(
  state: GameState,
  instanceId: string,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const card = currentPlayer.hand.find((c) => c.instanceId === instanceId);
  if (!card) {
    throw new Error(`手札にカードが見つかりません`);
  }
  if (!card.def.types.includes(CardType.Action)) {
    const cardName = card.def.nameJa ?? card.def.name;
    throw new Error(`${cardName}はアクションカードではありません`);
  }

  const updatedPlayer = playCard(currentPlayer, instanceId);
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p,
  );

  const turnState = {
    ...state.turnState,
    actions: state.turnState.actions - 1,
  };

  const afterPlay: GameState = { ...state, players, turnState };
  let result = applyBasicEffects(afterPlay, card, shuffleFn);

  if (card.def.effects.custom) {
    result = resolveCustomEffect(result, card, shuffleFn);
  }

  return result;
}

export function canBuy(state: GameState): boolean {
  return state.phase === Phase.Buy && state.turnState.buys > 0;
}

export function autoPlayTreasures(state: GameState): GameState {
  const currentPlayer = state.players[state.currentPlayerIndex];
  const treasures: CardInstance[] = [];
  const remaining: CardInstance[] = [];

  for (const card of currentPlayer.hand) {
    if (card.def.types.includes(CardType.Treasure)) {
      treasures.push(card);
    } else {
      remaining.push(card);
    }
  }

  let coins = state.turnState.coins;
  for (const t of treasures) {
    coins += t.def.effects.coins ?? 0;
  }

  // Merchant bonus: +1 coin per Silver played, up to the number of Merchants in play area
  const merchantCount = currentPlayer.playArea.filter(
    (c) => c.def.name === 'Merchant',
  ).length;
  if (merchantCount > 0) {
    const silverCount = treasures.filter((c) => c.def.name === 'Silver').length;
    coins += Math.min(merchantCount, silverCount);
  }

  const updatedPlayer = {
    ...currentPlayer,
    hand: remaining,
    playArea: [...currentPlayer.playArea, ...treasures],
  };

  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p,
  );

  return {
    ...state,
    players,
    turnState: { ...state.turnState, coins },
  };
}

export function buyCard(state: GameState, cardName: string): GameState {
  // Validate card name exists in card definitions
  try {
    getCardDef(cardName);
  } catch (error) {
    console.warn(`Invalid card name for buyCard: ${cardName}`);
    return state; // Early return if card doesn't exist
  }

  const [newSupply, cardDef] = takeFromSupply(state.supply, cardName);

  if (cardDef.cost > state.turnState.coins) {
    const displayName = cardDef.nameJa ?? cardName;
    throw new Error(
      `コインが足りません（所持: ${state.turnState.coins}、必要: ${cardDef.cost}）: ${displayName}`,
    );
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const updatedPlayer = gainCard(currentPlayer, cardDef);
  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p,
  );

  const turnState = {
    ...state.turnState,
    coins: state.turnState.coins - cardDef.cost,
    buys: state.turnState.buys - 1,
  };

  return { ...state, players, supply: newSupply, turnState };
}

export function advancePhase(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  switch (state.phase) {
    case Phase.Action: {
      const buyState = { ...state, phase: Phase.Buy };
      return autoPlayTreasures(buyState);
    }
    case Phase.Buy:
      return { ...state, phase: Phase.Cleanup };
    case Phase.Cleanup:
      return cleanupAndDraw(state, shuffleFn);
    default:
      return state;
  }
}

export function cleanupAndDraw(
  state: GameState,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  let currentPlayer = state.players[state.currentPlayerIndex];
  currentPlayer = discardHand(currentPlayer);
  currentPlayer = discardPlayArea(currentPlayer);
  currentPlayer = drawCards(currentPlayer, 5, shuffleFn);

  const players = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? currentPlayer : p,
  );

  return {
    ...state,
    players,
    phase: Phase.Action,
    turnState: createInitialTurnState(),
  };
}
