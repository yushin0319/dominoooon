// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createPlayer,
  drawCards,
  playCard,
  discardCard,
  discardHand,
  discardPlayArea,
  trashCardFromHand,
  gainCard,
  gainCardToHand,
  gainCardToDeck,
  calculateVP,
  getAllCards,
} from '../player';
import { getCardDef } from '../card';
import { createShuffleFn } from '../shuffle';

const deterministicShuffle = createShuffleFn(() => 0.5);

describe('createPlayer', () => {
  it('creates a player with 10 total cards (7 Copper + 3 Estate)', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const all = getAllCards(player);
    expect(all).toHaveLength(10);

    const coppers = all.filter((c) => c.def.name === 'Copper');
    const estates = all.filter((c) => c.def.name === 'Estate');
    expect(coppers).toHaveLength(7);
    expect(estates).toHaveLength(3);
  });

  it('has 5 cards in hand and 5 in deck after creation', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    expect(player.hand).toHaveLength(5);
    expect(player.deck).toHaveLength(5);
    expect(player.discard).toHaveLength(0);
    expect(player.playArea).toHaveLength(0);
  });

  it('sets id and name correctly', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    expect(player.id).toBe('p1');
    expect(player.name).toBe('Alice');
  });
});

describe('drawCards', () => {
  it('draws cards from deck to hand', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const after = drawCards(player, 2, deterministicShuffle);
    expect(after.hand).toHaveLength(7);
    expect(after.deck).toHaveLength(3);
  });

  it('reshuffles discard into deck when deck runs out', () => {
    let player = createPlayer('p1', 'Alice', deterministicShuffle);
    // Move all hand to discard so discard has cards
    player = discardHand(player);
    // deck=5, hand=0, discard=5
    // Draw 7: take 5 from deck, reshuffle 5 from discard, take 2 more
    const after = drawCards(player, 7, deterministicShuffle);
    expect(after.hand).toHaveLength(7);
    expect(after.deck).toHaveLength(3);
    expect(after.discard).toHaveLength(0);
  });

  it('draws only available cards when total is insufficient', () => {
    let player = createPlayer('p1', 'Alice', deterministicShuffle);
    // deck=5, hand=5, discard=0
    // Try to draw 20 - should only get 5 more (from deck), no discard to reshuffle
    const after = drawCards(player, 20, deterministicShuffle);
    expect(after.hand).toHaveLength(10);
    expect(after.deck).toHaveLength(0);
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const handBefore = player.hand.length;
    drawCards(player, 2, deterministicShuffle);
    expect(player.hand).toHaveLength(handBefore);
  });
});

describe('playCard', () => {
  it('moves card from hand to playArea', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    const after = playCard(player, cardId);
    expect(after.hand).toHaveLength(4);
    expect(after.playArea).toHaveLength(1);
    expect(after.playArea[0].instanceId).toBe(cardId);
  });

  it('throws when instanceId not in hand', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    expect(() => playCard(player, 'nonexistent')).toThrow();
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    playCard(player, cardId);
    expect(player.hand).toHaveLength(5);
    expect(player.playArea).toHaveLength(0);
  });
});

describe('discardCard', () => {
  it('moves card from hand to discard', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    const after = discardCard(player, cardId);
    expect(after.hand).toHaveLength(4);
    expect(after.discard).toHaveLength(1);
    expect(after.discard[0].instanceId).toBe(cardId);
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    discardCard(player, cardId);
    expect(player.hand).toHaveLength(5);
  });
});

describe('discardHand', () => {
  it('moves all hand cards to discard', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const after = discardHand(player);
    expect(after.hand).toHaveLength(0);
    expect(after.discard).toHaveLength(5);
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    discardHand(player);
    expect(player.hand).toHaveLength(5);
  });
});

describe('discardPlayArea', () => {
  it('moves all playArea cards to discard', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    const played = playCard(player, cardId);
    const after = discardPlayArea(played);
    expect(after.playArea).toHaveLength(0);
    expect(after.discard).toHaveLength(1);
  });
});

describe('trashCardFromHand', () => {
  it('removes card from hand and returns it', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    const [after, trashed] = trashCardFromHand(player, cardId);
    expect(after.hand).toHaveLength(4);
    expect(trashed.instanceId).toBe(cardId);
    // Card should not be in any zone
    expect(getAllCards(after)).toHaveLength(9);
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    trashCardFromHand(player, cardId);
    expect(player.hand).toHaveLength(5);
  });
});

describe('gainCard', () => {
  it('adds a new card instance to discard', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const silverDef = getCardDef('Silver');
    const after = gainCard(player, silverDef);
    expect(after.discard).toHaveLength(1);
    expect(after.discard[0].def.name).toBe('Silver');
    expect(getAllCards(after)).toHaveLength(11);
  });

  it('does not mutate original player', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    gainCard(player, getCardDef('Silver'));
    expect(player.discard).toHaveLength(0);
  });
});

describe('gainCardToHand', () => {
  it('adds a new card instance to hand', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const after = gainCardToHand(player, getCardDef('Gold'));
    expect(after.hand).toHaveLength(6);
    expect(after.hand[after.hand.length - 1].def.name).toBe('Gold');
  });
});

describe('gainCardToDeck', () => {
  it('adds a new card instance to top of deck', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const after = gainCardToDeck(player, getCardDef('Silver'));
    expect(after.deck).toHaveLength(6);
    expect(after.deck[0].def.name).toBe('Silver');
  });
});

describe('calculateVP', () => {
  it('calculates basic VP from vpValue', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    // 3 Estates = 3 VP
    expect(calculateVP(player)).toBe(3);
  });

  it('includes Gardens vpCalculator', () => {
    let player = createPlayer('p1', 'Alice', deterministicShuffle);
    // 10 cards + 1 Gardens = 11 cards -> Gardens gives 1 VP
    player = gainCard(player, getCardDef('Gardens'));
    // 3 Estates (3 VP) + 1 Gardens (floor(11/10)=1 VP) = 4 VP
    expect(calculateVP(player)).toBe(4);
  });

  it('subtracts Curse VP', () => {
    let player = createPlayer('p1', 'Alice', deterministicShuffle);
    player = gainCard(player, getCardDef('Curse'));
    // 3 Estates (3 VP) + 1 Curse (-1 VP) = 2 VP
    expect(calculateVP(player)).toBe(2);
  });
});

describe('getAllCards', () => {
  it('returns all cards from all zones', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const all = getAllCards(player);
    expect(all).toHaveLength(10);
  });

  it('includes cards from playArea', () => {
    const player = createPlayer('p1', 'Alice', deterministicShuffle);
    const cardId = player.hand[0].instanceId;
    const played = playCard(player, cardId);
    expect(getAllCards(played)).toHaveLength(10);
  });
});
