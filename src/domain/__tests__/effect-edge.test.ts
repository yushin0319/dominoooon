// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  resolveCustomEffect,
  resolvePendingEffect,
  type PendingEffectChoice,
} from '../effect';
import { getCardDef, createCardInstance } from '../card';
import { createPlayer } from '../player';
import { initializeSupply } from '../supply';
import { createShuffleFn } from '../shuffle';
import { Phase } from '../../types';
import type { GameState, PlayerState, SupplyPile } from '../../types';

const shuffle = createShuffleFn(() => 0.5);

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

const defaultKingdom = [
  getCardDef('Village'), getCardDef('Smithy'), getCardDef('Market'),
  getCardDef('Festival'), getCardDef('Laboratory'), getCardDef('Cellar'),
  getCardDef('Moat'), getCardDef('Militia'), getCardDef('Mine'),
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
  return supply.map((p) => p.card.name === cardName ? { ...p, count: 0 } : p);
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
      expect(after.players[1].discard.some((c) => c.def.name === 'Curse')).toBe(true);
      expect(after.players[2].discard.some((c) => c.def.name === 'Curse')).toBe(true);
    });
  });

  describe('bandit', () => {
    it('does not trash when opponent reveals only Coppers', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const copper1 = createCardInstance(getCardDef('Copper'));
      const copper2 = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [copper1, copper2], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Coppers go to discard, not trashed
      expect(after.trash).toHaveLength(0);
      expect(after.players[1].discard).toHaveLength(2);
    });

    it('skips attack when opponent has empty deck and discard', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // p1 still gains Gold
      expect(after.players[0].discard.some((c) => c.def.name === 'Gold')).toBe(true);
      expect(after.trash).toHaveLength(0);
    });

    it('does not gain Gold when Gold supply is empty', () => {
      const card = createCardInstance(getCardDef('Bandit'));
      const p1 = makePlayer({ discard: [] });
      const silver = createCardInstance(getCardDef('Silver'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [silver, estate], discard: [] });
      const supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Gold');
      const state = makeGameState({ players: [p1, p2], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].discard.every((c) => c.def.name !== 'Gold')).toBe(true);
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
        id: 'p2', name: 'Bob', hand: [],
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
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [gold, silver], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Gold (cost 6) should be trashed, Silver (cost 3) goes to discard
      expect(after.trash.some((c) => c.def.name === 'Gold')).toBe(true);
      expect(after.players[1].discard.some((c) => c.def.name === 'Silver')).toBe(true);
    });
  });

  describe('bureaucrat', () => {
    it('does not gain Silver when Silver supply is empty', () => {
      const card = createCardInstance(getCardDef('Bureaucrat'));
      const p1 = makePlayer({ deck: [] });
      const estate = createCardInstance(getCardDef('Estate'));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [estate], deck: [] });
      const supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Silver');
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
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [copper], deck: [] });
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
      const hand = Array(3).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('does not create pending when opponent has fewer than 3 cards', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [createCardInstance(getCardDef('Copper'))] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('chains pending across multiple opponents', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand5a = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const hand5b = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: hand5a, discard: [] });
      const p3 = makePlayer({ id: 'p3', name: 'Carol', hand: hand5b, discard: [] });
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

// ===== Basic Card Edge Cases =====
describe('basic card edge cases', () => {
  describe('cellar', () => {
    it('discarding 0 cards draws 0 cards', () => {
      const card = createCardInstance(getCardDef('Cellar'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.trash).toHaveLength(0);
    });

    it('caps at 4 cards when more are selected', () => {
      const card = createCardInstance(getCardDef('Chapel'));
      const cards = Array(6).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand: cards });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Needed 6, but only 2 available → hand = 1 + 2 = 3
      expect(after.players[0].hand).toHaveLength(3);
    });
  });

  describe('councilRoom', () => {
    it('opponent with empty deck draws 0 cards', () => {
      const card = createCardInstance(getCardDef('Council Room'));
      const p1 = makePlayer();
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[1].hand).toHaveLength(0);
    });
  });

  describe('moneylender', () => {
    it('returns state unchanged when hand is empty', () => {
      const card = createCardInstance(getCardDef('Moneylender'));
      const p1 = makePlayer({ hand: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)], supply });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.data!.discardCount).toBe(2);

      const choice: PendingEffectChoice = { selectedCards: [c1.instanceId, c2.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.players[0].discard).toHaveLength(2);
    });

    it('returns state when player hand is empty', () => {
      const card = createCardInstance(getCardDef('Poacher'));
      const p1 = makePlayer({ hand: [] });
      let supply = emptyPile(initializeSupply(defaultKingdom, 2), 'Village');
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)], supply });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('harbinger', () => {
    it('choosing no card just clears pending', () => {
      const card = createCardInstance(getCardDef('Harbinger'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [estate] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCards: [] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Card stays in discard
      expect(after.players[0].discard).toHaveLength(1);
    });
  });
});

// ===== Complex Card Edge Cases =====
describe('complex card edge cases', () => {
  describe('vassal', () => {
    it('does nothing with empty deck and empty discard', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].discard).toHaveLength(0);
    });

    it('reshuffles discard when deck is empty', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [village] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      // Village is Action → pending created
      expect(after.pendingEffect).not.toBeNull();
      expect(after.pendingEffect!.type).toBe('vassal');
    });

    it('declining to play Action just clears pending', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({ hand: [], deck: [village], discard: [], playArea: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      const revealedCards = withPending.pendingEffect!.data!.revealedCards as Array<{ instanceId: string }>;
      expect(revealedCards).toHaveLength(1);
    });

    it('returns state with empty deck and discard', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const p1 = makePlayer({ hand: [], deck: [], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });

    it('trashing all revealed cards leaves none on deck', () => {
      const card = createCardInstance(getCardDef('Sentry'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [], deck: [c1, c2], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('remodel', () => {
    it('clears pending when no card selected for trash', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const trashChoice: PendingEffectChoice = { selectedCards: [copper.instanceId] };
      const afterTrash = resolvePendingEffect(withPending, trashChoice, shuffle);
      // maxCost = 0 + 2 = 2. Silver costs 3 → rejected
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Silver' };
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Silver NOT gained because cost 3 > max 2
      expect(after.players[0].discard.every((c) => c.def.name !== 'Silver')).toBe(true);
    });
  });

  describe('workshop', () => {
    it('clears pending when no card name selected', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Gold costs 6 → rejected
      const choice: PendingEffectChoice = { selectedCardName: 'Gold' };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand.every((c) => c.def.name !== 'Gold')).toBe(true);
    });

    it('clears pending when putBack has no card selected', () => {
      const card = createCardInstance(getCardDef('Artisan'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
    it('returns state unchanged when non-Action selected', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const village = createCardInstance(getCardDef('Village'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [village, copper], playArea: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Select Copper (non-Action)
      const choice: PendingEffectChoice = { selectedCards: [copper.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      // Should return state unchanged (with warning)
      expect(after.players[0].hand).toHaveLength(2);
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
    const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

    const after = resolveCustomEffect(state, cellar, shuffle);
    expect(after.pendingEffect).toBeNull();
  });
});
