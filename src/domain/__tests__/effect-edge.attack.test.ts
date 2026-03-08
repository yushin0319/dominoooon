// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState, SupplyPile } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { resolveCustomEffect } from '../effect';
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

// ===== Attack Edge Cases =====
describe('attack edge cases', () => {
  describe('witch', () => {
    it('does nothing when Curse supply is empty', () => {
      const card = createCardInstance(getCardDef('Witch'));
      const p1 = makePlayer();
      const p2 = makePlayer({ id: 'p2', name: 'Bob', discard: [] });
      const supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Curse');
      const state = makeGameState({ players: [p1, p2], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].discard).toHaveLength(0);
    });

    it('distributes curses to multiple opponents', () => {
      const card = createCardInstance(getCardDef('Witch'));
      const p1 = makePlayer();
      const p2 = makePlayer({ id: 'p2', name: 'Bob', discard: [] });
      const p3 = makePlayer({ id: 'p3', name: 'Carol', discard: [] });
      const supply = initializeSupply(defaultKingdom, 3);
      const state = makeGameState({ players: [p1, p2, p3], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].discard.some((c) => c.def.name === 'Curse')).toBe(
        true,
      );
      expect(after.players[2].discard.some((c) => c.def.name === 'Curse')).toBe(
        true,
      );
    });
  });

  describe('bandit', () => {
    it('does not trash when opponent reveals only Coppers', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const copper1 = createCardInstance(getCardDef('Copper'));
      const copper2 = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [copper1, copper2],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Coppers go to discard, not trashed
      expect(after.trash).toHaveLength(0);
      expect(after.players[1].discard).toHaveLength(2);
    });

    it('skips attack when opponent has empty deck and discard', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // p1 still gains Gold
      expect(after.players[0].discard.some((c) => c.def.name === 'Gold')).toBe(
        true,
      );
      expect(after.trash).toHaveLength(0);
    });

    it('does not gain Gold when Gold supply is empty', () => {
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
      const supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Gold');
      const state = makeGameState({ players: [p1, p2], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].discard.every((c) => c.def.name !== 'Gold')).toBe(
        true,
      );
      // Attack still works
      expect(after.trash.some((c) => c.def.name === 'Silver')).toBe(true);
    });

    it('reshuffles opponent discard when deck < 2', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const silver = createCardInstance(getCardDef('Silver'));
      const estate = createCardInstance(getCardDef('Estate'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [copper], // only 1 card in deck
        discard: [silver, estate], // 2 cards in discard → reshuffle
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Should reveal 2 cards total (1 from deck + reshuffle discard)
      // Silver (non-Copper treasure) should be trashed
      expect(after.trash.some((c) => c.def.name === 'Silver')).toBe(true);
    });

    it('trashes highest-cost treasure when multiple non-Copper treasures revealed', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const silver = createCardInstance(getCardDef('Silver'));
      const gold = createCardInstance(getCardDef('Gold'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [],
        deck: [gold, silver],
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Gold (cost 6) should be trashed, Silver (cost 3) goes to discard
      expect(after.trash.some((c) => c.def.name === 'Gold')).toBe(true);
      expect(
        after.players[1].discard.some((c) => c.def.name === 'Silver'),
      ).toBe(true);
    });
  });
});
