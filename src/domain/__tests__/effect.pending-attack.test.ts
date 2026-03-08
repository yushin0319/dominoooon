// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import {
  type PendingEffectChoice,
  resolveCustomEffect,
  resolvePendingEffect,
} from '../effect';
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

// ===== PendingEffect creators + resolvers (attack/complex cards) =====
describe('resolveCustomEffect + resolvePendingEffect - attacks', () => {
  describe('militia', () => {
    it('creates pending for opponent to discard to 3', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand, discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      expect(withPending.pendingEffect!.type).toBe('militia');

      // Opponent discards 2 cards (from 5 to 3)
      const choice: PendingEffectChoice = {
        selectedCards: [hand[0].instanceId, hand[1].instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[1].hand).toHaveLength(3);
      expect(after.players[1].discard).toHaveLength(2);
    });

    it('skips players with Moat', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const moat = createCardInstance(getCardDef('Moat'));
      const hand = [
        moat,
        ...Array(4)
          .fill(null)
          .map(() => createCardInstance(getCardDef('Copper'))),
      ];
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // No pending because Moat blocks
      expect(after.pendingEffect).toBeNull();
    });

    it('throws when insufficient cards are selected to discard', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand, discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect?.type).toBe('militia');

      // Only discard 1 card when 2 are required (hand=5, need to reduce to 3)
      const choice: PendingEffectChoice = {
        selectedCards: [hand[0].instanceId],
      };
      expect(() =>
        resolvePendingEffect(withPending, choice, shuffle),
      ).toThrow();
    });
  });

  describe('throneRoom', () => {
    it('creates pending, plays chosen Action twice', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const village = createCardInstance(getCardDef('Village')); // +1 card, +2 actions
      const deck = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({
        hand: [village],
        deck,
        discard: [],
        playArea: [],
      });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
        turnState: { actions: 0, buys: 1, coins: 0 },
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('throneRoom');

      const choice: PendingEffectChoice = {
        selectedCards: [village.instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      // Village played twice: +2 cards (1+1), +4 actions (2+2)
      expect(after.players[0].hand).toHaveLength(2); // drew 2 cards
      expect(after.turnState.actions).toBe(4); // 0 + 2 + 2
      expect(after.players[0].playArea).toHaveLength(1); // card moved once
    });

    it('does nothing when no Action in hand', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('throws when non-Action card is selected', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const village = createCardInstance(getCardDef('Village'));
      const copper = createCardInstance(getCardDef('Copper'));
      // copper is in hand so the "not found" check passes, but it's not an Action
      const p1 = makePlayer({
        hand: [village, copper],
        deck: [],
        discard: [],
        playArea: [],
      });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });
      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect?.type).toBe('throneRoom');

      const choice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      expect(() =>
        resolvePendingEffect(withPending, choice, shuffle),
      ).toThrow();
    });
  });

  describe('poacher', () => {
    it('creates pending when empty supply piles exist', () => {
      const card = createCardInstance(getCardDef('Poacher'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      // Create supply with an empty pile
      const supply = initializeSupply(defaultKingdom, 2).map((p) =>
        p.card.name === 'Village' ? { ...p, count: 0 } : p,
      );
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
        supply,
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('poacher');

      const choice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(0);
      expect(after.players[0].discard).toHaveLength(1);
    });

    it('does nothing when no empty piles', () => {
      const card = createCardInstance(getCardDef('Poacher'));
      const state = makeGameState();
      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('harbinger', () => {
    it('creates pending when discard is non-empty, resolves by putting card on deck', () => {
      const card = createCardInstance(getCardDef('Harbinger'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('harbinger');

      const choice: PendingEffectChoice = {
        selectedCards: [estate.instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].deck[0].instanceId).toBe(estate.instanceId);
      expect(after.players[0].discard).toHaveLength(0);
    });

    it('does nothing when discard is empty', () => {
      const card = createCardInstance(getCardDef('Harbinger'));
      const p1 = makePlayer({ discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('vassal', () => {
    it('discards top card; if Action, creates pending', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({ hand: [], deck: [village], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('vassal');
      // Village should be in discard
      expect(withPending.players[0].discard).toHaveLength(1);

      // Choose to play it
      const choice: PendingEffectChoice = { confirmed: true };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].playArea).toHaveLength(1);
    });

    it('just discards if not Action', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [], deck: [copper], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].discard).toHaveLength(1);
    });
  });

  describe('sentry', () => {
    it('reveals top 2, creates pending for trash/keep decisions', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [c1, c2], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('sentry');
      // Deck should be empty (both revealed)
      expect(withPending.players[0].deck).toHaveLength(0);

      // Trash c1, put c2 back on deck
      const choice: PendingEffectChoice = { selectedCards: [c1.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.trash).toHaveLength(1);
      expect(after.trash[0].def.name).toBe('Copper');
      expect(after.players[0].deck).toHaveLength(1);
      expect(after.players[0].deck[0].def.name).toBe('Estate');
    });
  });
});
