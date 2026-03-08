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

  describe('remodel', () => {
    it('clears pending when no card selected for trash', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.trash).toHaveLength(0);
    });

    it('rejects gain card exceeding cost limit', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const copper = createCardInstance(getCardDef('Copper')); // cost 0
      const p1 = makePlayer({ hand: [copper], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const trashChoice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      const afterTrash = resolvePendingEffect(
        withPending,
        trashChoice,
        shuffle,
      );
      // maxCost = 0 + 2 = 2. Silver costs 3 → rejected
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Silver' };
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Silver NOT gained because cost 3 > max 2
      expect(
        after.players[0].discard.every((c) => c.def.name !== 'Silver'),
      ).toBe(true);
    });
  });

  describe('workshop', () => {
    it('clears pending when no card name selected', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = {};
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('artisan', () => {
    it('rejects card costing > 5', () => {
      const card = createCardInstance(getCardDef('Artisan'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Gold costs 6 → rejected
      const choice: PendingEffectChoice = { selectedCardName: 'Gold' };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand.every((c) => c.def.name !== 'Gold')).toBe(
        true,
      );
    });

    it('clears pending when putBack has no card selected', () => {
      const card = createCardInstance(getCardDef('Artisan'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Gain Silver (cost 3 ≤ 5)
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Silver' };
      const afterGain = resolvePendingEffect(withPending, gainChoice, shuffle);
      expect(afterGain.pendingEffect!.data!.phase).toBe('putBack');

      // putBack with no selection
      const putBackChoice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(afterGain, putBackChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('throneRoom', () => {
    it('throws when non-Action card is selected', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const village = createCardInstance(getCardDef('Village'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [village, copper], playArea: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Select Copper (non-Action) — should throw
      const choice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      expect(() => resolvePendingEffect(withPending, choice, shuffle)).toThrow(
        'Throne Room: must select an Action card',
      );
    });
  });
});

// ===== Misc Edge Cases =====
describe('misc edge cases', () => {
  it('resolvePendingEffect returns state when no pending', () => {
    const state = makeGameState();
    const choice: PendingEffectChoice = { selectedCards: [] };
    const after = resolvePendingEffect(state, choice, shuffle);
    expect(after).toEqual(state);
  });

  it('resolveCustomEffect handles empty hand for pending creators', () => {
    // Cellar, Chapel, Workshop all check hand.length === 0 via createPending
    const cellar = createCardInstance(getCardDef('Cellar'));
    const p1 = makePlayer({ hand: [] });
    const state = makeGameState({
      players: [p1, createPlayer('p2', 'Bob', shuffle)],
    });

    const after = resolveCustomEffect(state, cellar, shuffle);
    expect(after.pendingEffect).toBeNull();
  });
});
