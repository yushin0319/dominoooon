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

// ===== Immutability =====
describe('immutability', () => {
  it('resolveCustomEffect does not mutate original state', () => {
    const card = createCardInstance(getCardDef('Council Room'));
    const p2 = makePlayer({
      id: 'p2',
      name: 'Bob',
      hand: [],
      deck: Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper'))),
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
    const state = makeGameState({
      players: [p1, createPlayer('p2', 'Bob', shuffle)],
    });

    const withPending = resolveCustomEffect(state, card, shuffle);
    const choice: PendingEffectChoice = { selectedCards: [copper.instanceId] };
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
