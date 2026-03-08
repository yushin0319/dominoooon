// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { createPlayer } from '../player';
import { createShuffleFn } from '../shuffle';
import { initializeSupply } from '../supply';
import {
  applyBasicEffects,
  canPlayAction,
  createInitialTurnState,
  playActionCard,
} from '../turn';

const shuffle = createShuffleFn(() => 0.5);

function createTestPlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

function createTestGameState(overrides?: Partial<GameState>): GameState {
  const players = [createTestPlayer(), createPlayer('p2', 'Bob', shuffle)];
  const kingdom = [
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
  const supply = initializeSupply(kingdom, 2);
  const base: GameState = {
    players,
    supply,
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: createInitialTurnState(),
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [],
  };
  return { ...base, ...overrides };
}

describe('createInitialTurnState', () => {
  it('returns actions=1, buys=1, coins=0', () => {
    const ts = createInitialTurnState();
    expect(ts.actions).toBe(1);
    expect(ts.buys).toBe(1);
    expect(ts.coins).toBe(0);
  });
});

describe('applyBasicEffects', () => {
  it('applies +Cards effect (draws cards)', () => {
    const state = createTestGameState();
    const smithy = createCardInstance(getCardDef('Smithy'));
    const after = applyBasicEffects(state, smithy, shuffle);
    expect(after.players[0].hand.length).toBe(state.players[0].hand.length + 3);
  });

  it('applies +Actions effect', () => {
    const state = createTestGameState();
    const village = createCardInstance(getCardDef('Village'));
    const after = applyBasicEffects(state, village, shuffle);
    expect(after.turnState.actions).toBe(state.turnState.actions + 2);
  });

  it('applies +Buys effect', () => {
    const state = createTestGameState();
    const festival = createCardInstance(getCardDef('Festival'));
    const after = applyBasicEffects(state, festival, shuffle);
    expect(after.turnState.buys).toBe(state.turnState.buys + 1);
  });

  it('applies +Coins effect', () => {
    const state = createTestGameState();
    const festival = createCardInstance(getCardDef('Festival'));
    const after = applyBasicEffects(state, festival, shuffle);
    expect(after.turnState.coins).toBe(state.turnState.coins + 2);
  });

  it('applies multiple effects together', () => {
    const state = createTestGameState();
    // Market: +1 card, +1 action, +1 buy, +1 coin
    const market = createCardInstance(getCardDef('Market'));
    const after = applyBasicEffects(state, market, shuffle);
    expect(after.players[0].hand.length).toBe(state.players[0].hand.length + 1);
    expect(after.turnState.actions).toBe(state.turnState.actions + 1);
    expect(after.turnState.buys).toBe(state.turnState.buys + 1);
    expect(after.turnState.coins).toBe(state.turnState.coins + 1);
  });

  it('does not mutate original state', () => {
    const state = createTestGameState();
    const village = createCardInstance(getCardDef('Village'));
    applyBasicEffects(state, village, shuffle);
    expect(state.turnState.actions).toBe(1);
  });
});

describe('canPlayAction', () => {
  it('returns true when in Action phase with actions and Action card in hand', () => {
    // Give player a Village in hand
    const villageInst = createCardInstance(getCardDef('Village'));
    const player = createTestPlayer({ hand: [villageInst] });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    });
    expect(canPlayAction(state)).toBe(true);
  });

  it('returns false when actions = 0', () => {
    const villageInst = createCardInstance(getCardDef('Village'));
    const player = createTestPlayer({ hand: [villageInst] });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Action,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });
    expect(canPlayAction(state)).toBe(false);
  });

  it('returns false when no Action card in hand', () => {
    // Hand has only Copper (Treasure)
    const copperInst = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({ hand: [copperInst] });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    });
    expect(canPlayAction(state)).toBe(false);
  });

  it('returns false when not in Action phase', () => {
    const villageInst = createCardInstance(getCardDef('Village'));
    const player = createTestPlayer({ hand: [villageInst] });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 1, buys: 1, coins: 0 },
    });
    expect(canPlayAction(state)).toBe(false);
  });
});

describe('playActionCard', () => {
  it('plays an action card, reduces actions, applies effects', () => {
    // Village: +1 card, +2 actions
    const villageInst = createCardInstance(getCardDef('Village'));
    const copperInst = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [villageInst, copperInst],
      deck: [
        createCardInstance(getCardDef('Copper')),
        createCardInstance(getCardDef('Estate')),
      ],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      turnState: { actions: 1, buys: 1, coins: 0 },
    });

    const after = playActionCard(state, villageInst.instanceId, shuffle);
    // Village played: hand loses Village, gains 1 card from deck
    expect(after.players[0].playArea).toHaveLength(1);
    expect(after.players[0].playArea[0].instanceId).toBe(
      villageInst.instanceId,
    );
    // actions: 1 - 1 (play) + 2 (effect) = 2
    expect(after.turnState.actions).toBe(2);
    // hand: started with 2, played 1 Village, drew 1 = 2
    expect(after.players[0].hand).toHaveLength(2);
  });

  it('throws when card is not Action type', () => {
    const copperInst = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({ hand: [copperInst] });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
    });
    expect(() =>
      playActionCard(state, copperInst.instanceId, shuffle),
    ).toThrow();
  });

  it('does not mutate original state', () => {
    const villageInst = createCardInstance(getCardDef('Village'));
    const player = createTestPlayer({
      hand: [villageInst],
      deck: [createCardInstance(getCardDef('Copper'))],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
    });
    playActionCard(state, villageInst.instanceId, shuffle);
    expect(state.turnState.actions).toBe(1);
    expect(state.players[0].hand).toHaveLength(1);
  });
});
