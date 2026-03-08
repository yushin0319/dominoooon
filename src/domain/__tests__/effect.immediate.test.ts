// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { hasMoatReaction, resolveCustomEffect } from '../effect';
import { createPlayer } from '../player';
import { createShuffleFn } from '../shuffle';
import { initializeSupply } from '../supply';

const shuffle = createShuffleFn(() => 0.5);

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

const defaultKingdom = [
  getCardDef('Village'),
  getCardDef('Smithy'),
  getCardDef('Market'),
  getCardDef('Festival'),
  getCardDef('Laboratory'),
  getCardDef('Cellar'),
  getCardDef('Moat'),
  getCardDef('Militia'),
  getCardDef('Mine'),
  getCardDef('Witch'),
];

function makeGameState(overrides?: Partial<GameState>): GameState {
  const players = [makePlayer(), createPlayer('p2', 'Bob', shuffle)];
  const base: GameState = {
    players,
    supply: initializeSupply(defaultKingdom, 2),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: { actions: 1, buys: 1, coins: 0 },
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [],
  };
  return { ...base, ...overrides };
}

// ===== hasMoatReaction =====
describe('hasMoatReaction', () => {
  it('returns true when player has Moat in hand', () => {
    const moat = createCardInstance(getCardDef('Moat'));
    const player = makePlayer({ hand: [moat] });
    expect(hasMoatReaction(player)).toBe(true);
  });

  it('returns false when no Moat', () => {
    const copper = createCardInstance(getCardDef('Copper'));
    const player = makePlayer({ hand: [copper] });
    expect(hasMoatReaction(player)).toBe(false);
  });
});

// ===== Immediate resolvers =====
describe('resolveCustomEffect - immediate', () => {
  describe('councilRoom', () => {
    it('other players draw 1 card', () => {
      const card = createCardInstance(getCardDef('Council Room'));
      const p1 = makePlayer({
        hand: [],
        deck: Array(5)
          .fill(null)
          .map(() => createCardInstance(getCardDef('Copper'))),
      });
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: Array(5)
          .fill(null)
          .map(() => createCardInstance(getCardDef('Copper'))),
      });
      const state = makeGameState({ players: [p1, p2], currentPlayerIndex: 0 });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].hand).toHaveLength(1);
      expect(after.players[0].hand).toHaveLength(0); // current player not affected
    });
  });

  describe('witch', () => {
    it('gives Curse to other players', () => {
      const card = createCardInstance(getCardDef('Witch'));
      const p1 = makePlayer();
      const p2 = makePlayer({ id: 'p2', name: 'Bob', discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      const p2Curses = after.players[1].discard.filter(
        (c) => c.def.name === 'Curse',
      );
      expect(p2Curses).toHaveLength(1);
    });

    it('skips players with Moat', () => {
      const card = createCardInstance(getCardDef('Witch'));
      const p1 = makePlayer();
      const moat = createCardInstance(getCardDef('Moat'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [moat],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      const p2Curses = after.players[1].discard.filter(
        (c) => c.def.name === 'Curse',
      );
      expect(p2Curses).toHaveLength(0);
    });
  });

  describe('moneylender', () => {
    it('trashes Copper and gives +3 coins', () => {
      const card = createCardInstance(getCardDef('Moneylender'));
      const copper = createCardInstance(getCardDef('Copper'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [copper, estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.players[0].hand[0].def.name).toBe('Estate');
      expect(after.turnState.coins).toBe(3);
      expect(after.trash).toHaveLength(1);
    });

    it('does nothing when no Copper in hand', () => {
      const card = createCardInstance(getCardDef('Moneylender'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.turnState.coins).toBe(0);
    });
  });

  describe('library', () => {
    it('draws up to 7 cards', () => {
      const card = createCardInstance(getCardDef('Library'));
      const deck = Array(10)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const hand = [
        createCardInstance(getCardDef('Estate')),
        createCardInstance(getCardDef('Estate')),
      ];
      const p1 = makePlayer({ hand, deck, discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(7);
    });

    it('does nothing if already at 7+ cards', () => {
      const card = createCardInstance(getCardDef('Library'));
      const hand = Array(7)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand, deck: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(7);
    });
  });

  describe('bandit', () => {
    it('gains Gold and trashes opponent non-Copper treasure', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const silver = createCardInstance(getCardDef('Silver'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [silver, estate],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // p1 gained Gold
      const p1Gold = after.players[0].discard.find(
        (c) => c.def.name === 'Gold',
      );
      expect(p1Gold).toBeDefined();
      // Silver trashed
      expect(after.trash.some((c) => c.def.name === 'Silver')).toBe(true);
      // Estate goes to discard
      expect(
        after.players[1].discard.some((c) => c.def.name === 'Estate'),
      ).toBe(true);
    });
  });

  describe('bureaucrat', () => {
    it('gains Silver to deck top and opponents put Victory on deck', () => {
      const card = createCardInstance(getCardDef('Bureaucrat'));
      const p1 = makePlayer({ deck: [] });
      const estate = createCardInstance(getCardDef('Estate'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [estate, copper],
        deck: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // p1 Silver on deck top
      expect(after.players[0].deck[0].def.name).toBe('Silver');
      // p2 Estate on deck top, removed from hand
      expect(after.players[1].deck[0].def.name).toBe('Estate');
      expect(after.players[1].hand).toHaveLength(1);
      expect(after.players[1].hand[0].def.name).toBe('Copper');
    });
  });

  describe('merchant', () => {
    it('does nothing (basic effects handled elsewhere)', () => {
      const card = createCardInstance(getCardDef('Merchant'));
      const state = makeGameState();
      const after = resolveCustomEffect(state, card, shuffle);
      expect(after).toEqual(state);
    });
  });
});
