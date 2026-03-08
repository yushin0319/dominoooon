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

// ===== Complex Card Edge Cases =====
describe('complex card edge cases', () => {
  describe('vassal', () => {
    it('does nothing with empty deck and empty discard', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].discard).toHaveLength(0);
    });

    it('reshuffles discard when deck is empty', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [village] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      // Village is Action → pending created
      expect(after.pendingEffect).not.toBeNull();
      expect(after.pendingEffect!.type).toBe('vassal');
    });

    it('declining to play Action just clears pending', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({
        hand: [],
        deck: [village],
        discard: [],
        playArea: [],
      });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { confirmed: false };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].playArea).toHaveLength(0);
    });
  });

  describe('sentry', () => {
    it('reveals only 1 card when deck has 1 card', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [], deck: [copper], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      const revealedCards = withPending.pendingEffect!.data!
        .revealedCards as Array<{ instanceId: string }>;
      expect(revealedCards).toHaveLength(1);
    });

    it('returns state with empty deck and discard', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('trashing all revealed cards leaves none on deck', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [c1, c2], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = {
        selectedCards: [c1.instanceId, c2.instanceId], // trash both
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.trash).toHaveLength(2);
      expect(after.players[0].deck).toHaveLength(0);
    });
  });

  describe('mine', () => {
    it('does not create pending when no Treasure in hand', () => {
      const card = createCardInstance(getCardDef('Mine'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });
});
