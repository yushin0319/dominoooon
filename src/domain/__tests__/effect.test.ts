// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  resolveCustomEffect,
  resolvePendingEffect,
  hasMoatReaction,
  type PendingEffectChoice,
} from '../effect';
import { getCardDef, createCardInstance } from '../card';
import { createPlayer } from '../player';
import { initializeSupply } from '../supply';
import { createShuffleFn } from '../shuffle';
import { Phase } from '../../types';
import type { GameState, PlayerState } from '../../types';

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
      const p1 = makePlayer({ hand: [], deck: Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper'))) });
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper'))) });
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
      const p2Curses = after.players[1].discard.filter((c) => c.def.name === 'Curse');
      expect(p2Curses).toHaveLength(1);
    });

    it('skips players with Moat', () => {
      const card = createCardInstance(getCardDef('Witch'));
      const p1 = makePlayer();
      const moat = createCardInstance(getCardDef('Moat'));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [moat], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      const p2Curses = after.players[1].discard.filter((c) => c.def.name === 'Curse');
      expect(p2Curses).toHaveLength(0);
    });
  });

  describe('moneylender', () => {
    it('trashes Copper and gives +3 coins', () => {
      const card = createCardInstance(getCardDef('Moneylender'));
      const copper = createCardInstance(getCardDef('Copper'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [copper, estate] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.turnState.coins).toBe(0);
    });
  });

  describe('library', () => {
    it('draws up to 7 cards', () => {
      const card = createCardInstance(getCardDef('Library'));
      const deck = Array(10).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const hand = [createCardInstance(getCardDef('Estate')), createCardInstance(getCardDef('Estate'))];
      const p1 = makePlayer({ hand, deck, discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.players[0].hand).toHaveLength(7);
    });

    it('does nothing if already at 7+ cards', () => {
      const card = createCardInstance(getCardDef('Library'));
      const hand = Array(7).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand, deck: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [], deck: [silver, estate], discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // p1 gained Gold
      const p1Gold = after.players[0].discard.find((c) => c.def.name === 'Gold');
      expect(p1Gold).toBeDefined();
      // Silver trashed
      expect(after.trash.some((c) => c.def.name === 'Silver')).toBe(true);
      // Estate goes to discard
      expect(after.players[1].discard.some((c) => c.def.name === 'Estate')).toBe(true);
    });
  });

  describe('bureaucrat', () => {
    it('gains Silver to deck top and opponents put Victory on deck', () => {
      const card = createCardInstance(getCardDef('Bureaucrat'));
      const p1 = makePlayer({ deck: [] });
      const estate = createCardInstance(getCardDef('Estate'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand: [estate, copper], deck: [] });
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

// ===== PendingEffect creators + resolvers =====
describe('resolveCustomEffect + resolvePendingEffect', () => {
  describe('cellar', () => {
    it('creates pending, resolves by discarding and drawing', () => {
      const card = createCardInstance(getCardDef('Cellar'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const deck = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand: [c1, c2], deck, discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      expect(withPending.pendingEffect!.type).toBe('cellar');

      const choice: PendingEffectChoice = { type: 'cellar', selectedCards: [c1.instanceId, c2.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Discarded 2, drew 2 => hand still has 2 (from deck)
      expect(after.players[0].hand).toHaveLength(2);
      expect(after.players[0].discard).toHaveLength(2);
    });
  });

  describe('chapel', () => {
    it('creates pending, resolves by trashing up to 4', () => {
      const card = createCardInstance(getCardDef('Chapel'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [c1, c2] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('chapel');

      const choice: PendingEffectChoice = { type: 'chapel', selectedCards: [c1.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.trash).toHaveLength(1);
      expect(after.trash[0].def.name).toBe('Copper');
    });
  });

  describe('workshop', () => {
    it('creates pending, resolves by gaining card costing <=4', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const p1 = makePlayer({ discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('workshop');

      const choice: PendingEffectChoice = { type: 'workshop', selectedCardName: 'Silver' };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].discard.some((c) => c.def.name === 'Silver')).toBe(true);
    });

    it('throws for card costing > 4', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const state = makeGameState();
      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { type: 'workshop', selectedCardName: 'Market' };
      expect(() => resolvePendingEffect(withPending, choice, shuffle)).toThrow();
    });
  });

  describe('remodel', () => {
    it('two-phase: trash then gain (cost +2)', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate')); // cost 2
      const p1 = makePlayer({ hand: [estate], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      // Phase 1: create pending
      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('remodel');
      expect(withPending.pendingEffect!.data!.phase).toBe('trash');

      // Phase 2: trash estate
      const trashChoice: PendingEffectChoice = { type: 'remodel', selectedCards: [estate.instanceId] };
      const afterTrash = resolvePendingEffect(withPending, trashChoice, shuffle);
      expect(afterTrash.pendingEffect!.data!.phase).toBe('gain');
      expect(afterTrash.trash).toHaveLength(1);

      // Phase 3: gain card costing <= 4 (estate cost 2 + 2)
      const gainChoice: PendingEffectChoice = { type: 'remodel', selectedCardName: 'Smithy' }; // cost 4
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].discard.some((c) => c.def.name === 'Smithy')).toBe(true);
    });
  });

  describe('mine', () => {
    it('two-phase: trash Treasure then gain Treasure to hand (cost +3)', () => {
      const card = createCardInstance(getCardDef('Mine'));
      const copper = createCardInstance(getCardDef('Copper')); // cost 0
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('mine');

      // Trash Copper
      const trashChoice: PendingEffectChoice = { type: 'mine', selectedCards: [copper.instanceId] };
      const afterTrash = resolvePendingEffect(withPending, trashChoice, shuffle);
      expect(afterTrash.pendingEffect!.data!.phase).toBe('gain');

      // Gain Silver (cost 3 <= 0+3) to hand
      const gainChoice: PendingEffectChoice = { type: 'mine', selectedCardName: 'Silver' };
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand.some((c) => c.def.name === 'Silver')).toBe(true);
    });
  });

  describe('artisan', () => {
    it('two-phase: gain to hand then put one card on deck', () => {
      const card = createCardInstance(getCardDef('Artisan'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('artisan');
      expect(withPending.pendingEffect!.data!.phase).toBe('gain');

      // Gain Market (cost 5) to hand
      const gainChoice: PendingEffectChoice = { type: 'artisan', selectedCardName: 'Market' };
      const afterGain = resolvePendingEffect(withPending, gainChoice, shuffle);
      expect(afterGain.pendingEffect!.data!.phase).toBe('putBack');
      expect(afterGain.players[0].hand.some((c) => c.def.name === 'Market')).toBe(true);

      // Put Copper on deck top
      const putBackChoice: PendingEffectChoice = { type: 'artisan', selectedCards: [copper.instanceId] };
      const after = resolvePendingEffect(afterGain, putBackChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].deck[0].def.name).toBe('Copper');
      expect(after.players[0].hand.every((c) => c.def.name !== 'Copper')).toBe(true);
    });
  });

  describe('militia', () => {
    it('creates pending for opponent to discard to 3', () => {
      const card = createCardInstance(getCardDef('Militia'));
      const p1 = makePlayer();
      const hand = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand, discard: [] });
      const state = makeGameState({ players: [p1, p2] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      expect(withPending.pendingEffect!.type).toBe('militia');

      // Opponent discards 2 cards (from 5 to 3)
      const choice: PendingEffectChoice = {
        type: 'militia',
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
      const hand = [moat, ...Array(4).fill(null).map(() => createCardInstance(getCardDef('Copper')))];
      const p2 = makePlayer({ id: 'p2', name: 'Bob', hand });
      const state = makeGameState({ players: [p1, p2] });

      const after = resolveCustomEffect(state, card, shuffle);
      // No pending because Moat blocks
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('throneRoom', () => {
    it('creates pending, plays chosen Action twice', () => {
      const card = createCardInstance(getCardDef('Throne Room'));
      const village = createCardInstance(getCardDef('Village')); // +1 card, +2 actions
      const deck = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand: [village], deck, discard: [], playArea: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
        turnState: { actions: 0, buys: 1, coins: 0 },
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('throneRoom');

      const choice: PendingEffectChoice = { type: 'throneRoom', selectedCards: [village.instanceId] };
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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)], supply });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('poacher');

      const choice: PendingEffectChoice = { type: 'poacher', selectedCards: [copper.instanceId] };
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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('harbinger');

      const choice: PendingEffectChoice = { type: 'harbinger', selectedCards: [estate.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].deck[0].instanceId).toBe(estate.instanceId);
      expect(after.players[0].discard).toHaveLength(0);
    });

    it('does nothing when discard is empty', () => {
      const card = createCardInstance(getCardDef('Harbinger'));
      const p1 = makePlayer({ discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const after = resolveCustomEffect(state, card, shuffle);
      expect(after.pendingEffect).toBeNull();
    });
  });

  describe('vassal', () => {
    it('discards top card; if Action, creates pending', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const village = createCardInstance(getCardDef('Village'));
      const p1 = makePlayer({ hand: [], deck: [village], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('vassal');
      // Village should be in discard
      expect(withPending.players[0].discard).toHaveLength(1);

      // Choose to play it
      const choice: PendingEffectChoice = { type: 'vassal', confirmed: true };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].playArea).toHaveLength(1);
    });

    it('just discards if not Action', () => {
      const card = createCardInstance(getCardDef('Vassal'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [], deck: [copper], discard: [] });
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

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
      const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('sentry');
      // Deck should be empty (both revealed)
      expect(withPending.players[0].deck).toHaveLength(0);

      // Trash c1, put c2 back on deck
      const choice: PendingEffectChoice = { type: 'sentry', selectedCards: [c1.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.trash).toHaveLength(1);
      expect(after.trash[0].def.name).toBe('Copper');
      expect(after.players[0].deck).toHaveLength(1);
      expect(after.players[0].deck[0].def.name).toBe('Estate');
    });
  });
});

// ===== Immutability =====
describe('immutability', () => {
  it('resolveCustomEffect does not mutate original state', () => {
    const card = createCardInstance(getCardDef('Council Room'));
    const p2 = makePlayer({
      id: 'p2', name: 'Bob',
      hand: [],
      deck: Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper'))),
    });
    const state = makeGameState({ players: [makePlayer(), p2] });
    const handBefore = state.players[1].hand.length;

    resolveCustomEffect(state, card, shuffle);
    expect(state.players[1].hand).toHaveLength(handBefore);
  });

  it('resolvePendingEffect does not mutate original state', () => {
    const card = createCardInstance(getCardDef('Chapel'));
    const copper = createCardInstance(getCardDef('Copper'));
    const p1 = makePlayer({ hand: [copper] });
    const state = makeGameState({ players: [p1, createPlayer('p2', 'Bob', shuffle)] });

    const withPending = resolveCustomEffect(state, card, shuffle);
    const choice: PendingEffectChoice = { type: 'chapel', selectedCards: [copper.instanceId] };
    resolvePendingEffect(withPending, choice, shuffle);
    expect(withPending.players[0].hand).toHaveLength(1);
    expect(withPending.trash).toHaveLength(0);
  });
});

// ===== No custom effect =====
describe('resolveCustomEffect - no custom', () => {
  it('returns state unchanged for card without custom', () => {
    const card = createCardInstance(getCardDef('Village'));
    const state = makeGameState();
    const after = resolveCustomEffect(state, card, shuffle);
    expect(after).toEqual(state);
  });
});
