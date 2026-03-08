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

// ===== Attack Edge Cases (2) =====
describe('attack edge cases - bureaucrat and militia', () => {
  describe('bureaucrat', () => {
    it('does not gain Silver when Silver supply is empty', () => {
      const card = createCardInstance(getCardDef('Bureaucrat'));
      const p1 = makePlayer({ deck: [] });
      const estate = createCardInstance(getCardDef('Estate'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [estate],
        deck: [],
      });
      const supply = initializeSupply(defaultKingdom, 2).map((p) =>
        p.card.name === 'Silver' ? { ...p, count: 0 } : p,
      );
      const state = makeGameState({ players: [p1, p2], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].deck).toHaveLength(0);
      // Attack still works
      expect(after.players[1].deck[0].def.name).toBe('Estate');
    });

    it('does nothing to opponent without Victory cards in hand', () => {
      const card = createCardInstance(getCardDef('Bureaucrat'));
      const p1 = makePlayer({ deck: [] });
      const copper = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [copper],
        deck: [],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].deck).toHaveLength(0);
      expect(after.players[1].hand).toHaveLength(1);
    });
  });

  describe('militia', () => {
    it('does not create pending when opponent has exactly 3 cards', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand = Array(3)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('does not create pending when opponent has fewer than 3 cards', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: [createCardInstance(getCardDef('Copper'))],
      });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('chains pending across multiple opponents', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand5a = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const hand5b = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({
        id: 'p2',
        name: 'Bob',
        hand: hand5a,
        discard: [],
      });
      const p3 = makePlayer({
        id: 'p3',
        name: 'Carol',
        hand: hand5b,
        discard: [],
      });
      const state = makeGameState({ players: [p1, p2, p3] });

      // First opponent
      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      expect(withPending.pendingEffect!.playerId).toBe('p2');

      // Resolve first opponent
      const choice1: PendingEffectChoice = {
        selectedCards: [hand5a[0].instanceId, hand5a[1].instanceId],
      };
      const afterFirst = resolvePendingEffect(withPending, choice1, shuffle);
      // Should chain to next opponent
      expect(afterFirst.pendingEffect).not.toBeNull();
      expect(afterFirst.pendingEffect!.playerId).toBe('p3');

      // Resolve second opponent
      const choice2: PendingEffectChoice = {
        selectedCards: [hand5b[0].instanceId, hand5b[1].instanceId],
      };
      const afterSecond = resolvePendingEffect(afterFirst, choice2, shuffle);
      expect(afterSecond.pendingEffect).toBeNull();
      expect(afterSecond.players[1].hand).toHaveLength(3);
      expect(afterSecond.players[2].hand).toHaveLength(3);
    });
  });
});
