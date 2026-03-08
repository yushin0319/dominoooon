// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState, SupplyPile } from '../../types';
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

/** Curseの山を空にしたsupplyを返す */
function emptyPile(supply: SupplyPile[], cardName: string): SupplyPile[] {
  return supply.map((p) => (p.card.name === cardName ? { ...p, count: 0 } : p));
}

// ===== Basic Card Edge Cases =====
describe('basic card edge cases', () => {
  describe('cellar', () => {
    it('discarding 0 cards draws 0 cards', () => {
      const card = createCardInstance(getCardDef('Cellar'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.players[0].discard).toHaveLength(0);
    });
  });

  describe('chapel', () => {
    it('trashing 0 cards is valid', () => {
      const card = createCardInstance(getCardDef('Chapel'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.trash).toHaveLength(0);
    });

    it('caps at 4 cards when more are selected', () => {
      const card = createCardInstance(getCardDef('Chapel'));
      const cards = Array(6)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand: cards });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = {
        selectedCards: cards.map((c) => c.instanceId), // 6 cards
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.trash).toHaveLength(4); // capped at 4
      expect(after.players[0].hand).toHaveLength(2); // 6 - 4
    });
  });

  describe('library', () => {
    it('draws as many as possible when deck + discard < needed', () => {
      const card = createCardInstance(getCardDef('Library'));
      const copper1 = createCardInstance(getCardDef('Copper'));
      const copper2 = createCardInstance(getCardDef('Copper'));
      const hand = [createCardInstance(getCardDef('Estate'))];
      const p1 = makePlayer({ hand, deck: [copper1], discard: [copper2] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      // Needed 6, but only 2 available → hand = 1 + 2 = 3
      expect(after.players[0].hand).toHaveLength(3);
    });
  });

  describe('councilRoom', () => {
    it('opponent with empty deck draws 0 cards', () => {
      const card = createCardInstance(getCardDef('Council Room'));
      const p1 = makePlayer();
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].hand).toHaveLength(0);
    });
  });

  describe('moneylender', () => {
    it('returns state unchanged when hand is empty', () => {
      const card = createCardInstance(getCardDef('Moneylender'));
      const p1 = makePlayer({ hand: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.turnState.coins).toBe(0);
      expect(after.trash).toHaveLength(0);
    });
  });

  describe('poacher', () => {
    it('requires multiple discards with multiple empty piles', () => {
      const card = createCardInstance(getCardDef('Poacher'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const c3 = createCardInstance(getCardDef('Silver'));
      const p1 = makePlayer({ hand: [c1, c2, c3], discard: [] });
      // 2 empty piles
      let supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Village');
      supply = emptyPile(supply, 'Smithy');
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
        supply,
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.data!.discardCount).toBe(2);

      const choice: PendingEffectChoice = {
        selectedCards: [c1.instanceId, c2.instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.players[0].discard).toHaveLength(2);
    });

    it('returns state when player hand is empty', () => {
      const card = createCardInstance(getCardDef('Poacher'));
      const p1 = makePlayer({ hand: [] });
      const supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Village');
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
        supply,
      });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('harbinger', () => {
    it('choosing no card just clears pending', () => {
      const card = createCardInstance(getCardDef('Harbinger'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Card stays in discard
      expect(after.players[0].discard).toHaveLength(1);
    });
  });
});
