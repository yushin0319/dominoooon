import { PlayerState, CardInstance, CardDef, ShuffleFn } from '../types';
import { getCardDef, createCardInstance } from './card';

export function createPlayer(
  id: string,
  name: string,
  shuffleFn: ShuffleFn,
): PlayerState {
  const initialCards: CardInstance[] = [];
  for (let i = 0; i < 7; i++) {
    initialCards.push(createCardInstance(getCardDef('Copper')));
  }
  for (let i = 0; i < 3; i++) {
    initialCards.push(createCardInstance(getCardDef('Estate')));
  }

  const deck = shuffleFn(initialCards);

  const player: PlayerState = {
    id,
    name,
    deck,
    hand: [],
    discard: [],
    playArea: [],
  };

  return drawCards(player, 5, shuffleFn);
}

export function drawCards(
  player: PlayerState,
  count: number,
  shuffleFn: ShuffleFn,
): PlayerState {
  let deck = [...player.deck];
  let discard = [...player.discard];
  const hand = [...player.hand];

  let remaining = count;

  while (remaining > 0) {
    if (deck.length > 0) {
      const toDraw = Math.min(remaining, deck.length);
      hand.push(...deck.slice(0, toDraw));
      deck = deck.slice(toDraw);
      remaining -= toDraw;
    } else if (discard.length > 0) {
      deck = shuffleFn(discard);
      discard = [];
    } else {
      break;
    }
  }

  return { ...player, deck, hand, discard };
}

export function playCard(player: PlayerState, instanceId: string): PlayerState {
  const idx = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) {
    throw new Error(`Card ${instanceId} not found in hand`);
  }
  const hand = [...player.hand];
  const [card] = hand.splice(idx, 1);
  return { ...player, hand, playArea: [...player.playArea, card] };
}

export function discardCard(
  player: PlayerState,
  instanceId: string,
): PlayerState {
  const idx = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) {
    throw new Error(`Card ${instanceId} not found in hand`);
  }
  const hand = [...player.hand];
  const [card] = hand.splice(idx, 1);
  return { ...player, hand, discard: [...player.discard, card] };
}

export function discardHand(player: PlayerState): PlayerState {
  return {
    ...player,
    hand: [],
    discard: [...player.discard, ...player.hand],
  };
}

export function discardPlayArea(player: PlayerState): PlayerState {
  return {
    ...player,
    playArea: [],
    discard: [...player.discard, ...player.playArea],
  };
}

export function trashCardFromHand(
  player: PlayerState,
  instanceId: string,
): [PlayerState, CardInstance] {
  const idx = player.hand.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) {
    throw new Error(`Card ${instanceId} not found in hand`);
  }
  const hand = [...player.hand];
  const [card] = hand.splice(idx, 1);
  return [{ ...player, hand }, card];
}

export function gainCard(player: PlayerState, cardDef: CardDef): PlayerState {
  const instance = createCardInstance(cardDef);
  return { ...player, discard: [...player.discard, instance] };
}

export function gainCardToHand(
  player: PlayerState,
  cardDef: CardDef,
): PlayerState {
  const instance = createCardInstance(cardDef);
  return { ...player, hand: [...player.hand, instance] };
}

export function gainCardToDeck(
  player: PlayerState,
  cardDef: CardDef,
): PlayerState {
  const instance = createCardInstance(cardDef);
  return { ...player, deck: [instance, ...player.deck] };
}

export function calculateVP(player: PlayerState): number {
  const all = getAllCards(player);
  let vp = 0;
  for (const card of all) {
    if (card.def.vpValue !== undefined) {
      vp += card.def.vpValue;
    }
    if (card.def.vpCalculator) {
      vp += card.def.vpCalculator(player);
    }
  }
  return vp;
}

export function getAllCards(player: PlayerState): CardInstance[] {
  return [
    ...player.deck,
    ...player.hand,
    ...player.discard,
    ...player.playArea,
  ];
}
