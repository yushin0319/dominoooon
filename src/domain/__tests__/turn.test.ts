// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  createInitialTurnState,
  applyBasicEffects,
  canPlayAction,
  playActionCard,
  canBuy,
  autoPlayTreasures,
  buyCard,
  advancePhase,
  cleanupAndDraw,
} from '../turn';
import { getCardDef, createCardInstance } from '../card';
import { createPlayer } from '../player';
import { initializeSupply } from '../supply';
import { createShuffleFn } from '../shuffle';
import { Phase } from '../../types';
import type { GameState, PlayerState } from '../../types';

const shuffle = createShuffleFn(() => 0.5);

function createTestPlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

function createTestGameState(overrides?: Partial<GameState>): GameState {
  const players = [
    createTestPlayer(),
    createPlayer('p2', 'Bob', shuffle),
  ];
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
      deck: [createCardInstance(getCardDef('Copper')), createCardInstance(getCardDef('Estate'))],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      turnState: { actions: 1, buys: 1, coins: 0 },
    });

    const after = playActionCard(state, villageInst.instanceId, shuffle);
    // Village played: hand loses Village, gains 1 card from deck
    expect(after.players[0].playArea).toHaveLength(1);
    expect(after.players[0].playArea[0].instanceId).toBe(villageInst.instanceId);
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
    expect(() => playActionCard(state, copperInst.instanceId, shuffle)).toThrow();
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

describe('canBuy', () => {
  it('returns true in Buy phase with buys > 0', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 3 },
    });
    expect(canBuy(state)).toBe(true);
  });

  it('returns false when buys = 0', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 0, coins: 3 },
    });
    expect(canBuy(state)).toBe(false);
  });

  it('returns false when not in Buy phase', () => {
    const state = createTestGameState({
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 3 },
    });
    expect(canBuy(state)).toBe(false);
  });
});

describe('autoPlayTreasures', () => {
  it('plays all treasure cards from hand and adds coins', () => {
    const copper1 = createCardInstance(getCardDef('Copper'));
    const copper2 = createCardInstance(getCardDef('Copper'));
    const silver = createCardInstance(getCardDef('Silver'));
    const gold = createCardInstance(getCardDef('Gold'));
    const village = createCardInstance(getCardDef('Village'));
    const player = createTestPlayer({
      hand: [copper1, copper2, silver, gold, village],
      deck: [],
      discard: [],
      playArea: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });

    const after = autoPlayTreasures(state);
    // Coins: 1 + 1 + 2 + 3 = 7
    expect(after.turnState.coins).toBe(7);
    // 4 treasures moved to playArea
    expect(after.players[0].playArea).toHaveLength(4);
    // Village stays in hand
    expect(after.players[0].hand).toHaveLength(1);
    expect(after.players[0].hand[0].def.name).toBe('Village');
  });

  it('does not mutate original state', () => {
    const copper = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [copper],
      deck: [],
      discard: [],
      playArea: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      turnState: { actions: 0, buys: 1, coins: 0 },
    });
    autoPlayTreasures(state);
    expect(state.turnState.coins).toBe(0);
    expect(state.players[0].hand).toHaveLength(1);
  });
});

describe('buyCard', () => {
  it('buys a card: deducts coins, reduces buys, adds to discard', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    const after = buyCard(state, 'Market');
    expect(after.turnState.coins).toBe(0); // 5 - 5(Market cost)
    expect(after.turnState.buys).toBe(0);
    // Discard should have gained a Market
    const gained = after.players[0].discard.find((c) => c.def.name === 'Market');
    expect(gained).toBeDefined();
  });

  it('throws when coins are insufficient', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 2 },
    });
    expect(() => buyCard(state, 'Market')).toThrow();
  });

  it('reduces supply count', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    const marketBefore = state.supply.find((p) => p.card.name === 'Market')!.count;
    const after = buyCard(state, 'Market');
    const marketAfter = after.supply.find((p) => p.card.name === 'Market')!.count;
    expect(marketAfter).toBe(marketBefore - 1);
  });

  it('does not mutate original state', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    buyCard(state, 'Market');
    expect(state.turnState.coins).toBe(5);
    expect(state.turnState.buys).toBe(1);
  });
});

describe('advancePhase', () => {
  it('advances Action → Buy and auto-plays treasures', () => {
    const copper = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [copper],
      deck: [],
      discard: [],
      playArea: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Action,
      turnState: { actions: 1, buys: 1, coins: 0 },
    });
    const after = advancePhase(state);
    expect(after.phase).toBe(Phase.Buy);
    // Copper auto-played: coins = 1
    expect(after.turnState.coins).toBe(1);
    expect(after.players[0].playArea).toHaveLength(1);
  });

  it('advances Buy → Cleanup', () => {
    const state = createTestGameState({ phase: Phase.Buy });
    const after = advancePhase(state);
    expect(after.phase).toBe(Phase.Cleanup);
  });

  it('advances Cleanup → Action (next turn via cleanupAndDraw)', () => {
    const copper1 = createCardInstance(getCardDef('Copper'));
    const copper2 = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [copper1],
      deck: [
        createCardInstance(getCardDef('Copper')),
        createCardInstance(getCardDef('Copper')),
        createCardInstance(getCardDef('Copper')),
        createCardInstance(getCardDef('Copper')),
        createCardInstance(getCardDef('Copper')),
      ],
      discard: [copper2],
      playArea: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Cleanup,
    });
    const after = advancePhase(state, shuffle);
    expect(after.phase).toBe(Phase.Action);
    expect(after.turnState.actions).toBe(1);
    expect(after.turnState.buys).toBe(1);
    expect(after.turnState.coins).toBe(0);
  });
});

describe('cleanupAndDraw', () => {
  it('discards hand and playArea, draws 5, resets turnState', () => {
    const hand = [createCardInstance(getCardDef('Copper'))];
    const playArea = [createCardInstance(getCardDef('Village'))];
    const deck = Array.from({ length: 5 }, () => createCardInstance(getCardDef('Copper')));
    const player = createTestPlayer({
      hand,
      playArea,
      deck,
      discard: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      turnState: { actions: 0, buys: 0, coins: 5 },
    });
    const after = cleanupAndDraw(state, shuffle);
    expect(after.players[0].hand).toHaveLength(5);
    expect(after.players[0].playArea).toHaveLength(0);
    expect(after.turnState).toEqual({ actions: 1, buys: 1, coins: 0 });
  });

  it('does not mutate original state', () => {
    const state = createTestGameState({
      turnState: { actions: 0, buys: 0, coins: 5 },
    });
    cleanupAndDraw(state, shuffle);
    expect(state.turnState.coins).toBe(5);
  });
});

describe('autoPlayTreasures - Merchant bonus', () => {
  it('adds +1 coin when Merchant is in play and Silver is played', () => {
    const merchantInst = createCardInstance(getCardDef('Merchant'));
    const silverInst = createCardInstance(getCardDef('Silver'));
    const copperInst = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [silverInst, copperInst],
      deck: [],
      discard: [],
      playArea: [merchantInst],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });

    const after = autoPlayTreasures(state);
    // Silver(2) + Copper(1) + Merchant bonus(1) = 4
    expect(after.turnState.coins).toBe(4);
  });

  it('adds +2 bonus with 2 Merchants and 2 Silvers', () => {
    const merchant1 = createCardInstance(getCardDef('Merchant'));
    const merchant2 = createCardInstance(getCardDef('Merchant'));
    const silver1 = createCardInstance(getCardDef('Silver'));
    const silver2 = createCardInstance(getCardDef('Silver'));
    const player = createTestPlayer({
      hand: [silver1, silver2],
      deck: [],
      discard: [],
      playArea: [merchant1, merchant2],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });

    const after = autoPlayTreasures(state);
    // Silver(2) + Silver(2) + Merchant bonus(2) = 6
    expect(after.turnState.coins).toBe(6);
  });

  it('gives no bonus when Merchant is in play but no Silver in hand', () => {
    const merchantInst = createCardInstance(getCardDef('Merchant'));
    const copperInst = createCardInstance(getCardDef('Copper'));
    const player = createTestPlayer({
      hand: [copperInst],
      deck: [],
      discard: [],
      playArea: [merchantInst],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });

    const after = autoPlayTreasures(state);
    // Copper(1), no Silver bonus
    expect(after.turnState.coins).toBe(1);
  });

  it('caps bonus at Merchant count (2 Merchants, 3 Silvers → +2 bonus)', () => {
    const merchant1 = createCardInstance(getCardDef('Merchant'));
    const merchant2 = createCardInstance(getCardDef('Merchant'));
    const silver1 = createCardInstance(getCardDef('Silver'));
    const silver2 = createCardInstance(getCardDef('Silver'));
    const silver3 = createCardInstance(getCardDef('Silver'));
    const player = createTestPlayer({
      hand: [silver1, silver2, silver3],
      deck: [],
      discard: [],
      playArea: [merchant1, merchant2],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 0 },
    });

    const after = autoPlayTreasures(state);
    // Silver(2)*3 + Merchant bonus(2) = 8
    expect(after.turnState.coins).toBe(8);
  });
});

describe('playActionCard - custom effects', () => {
  it('resolves custom effect for Council Room (+4 cards, +1 buy, others draw 1)', () => {
    const councilRoom = createCardInstance(getCardDef('Council Room'));
    const deckCards = Array.from({ length: 6 }, () =>
      createCardInstance(getCardDef('Copper')),
    );
    const player = createTestPlayer({
      hand: [councilRoom],
      deck: deckCards,
      discard: [],
      playArea: [],
    });
    const bob = createPlayer('p2', 'Bob', shuffle);
    const state = createTestGameState({
      players: [player, bob],
      turnState: { actions: 1, buys: 1, coins: 0 },
    });

    const after = playActionCard(state, councilRoom.instanceId, shuffle);
    // Player 0: drew 4 cards from basic effects
    // Player 1: drew 1 card from Council Room custom effect
    expect(after.players[1].hand.length).toBe(bob.hand.length + 1);
    // Buys: 1 - 0 (no buy deduction) + 1 (Council Room) = 2
    expect(after.turnState.buys).toBe(2);
  });

  it('does not call resolveCustomEffect for Smithy (no custom field)', () => {
    const smithy = createCardInstance(getCardDef('Smithy'));
    const deckCards = Array.from({ length: 5 }, () =>
      createCardInstance(getCardDef('Copper')),
    );
    const player = createTestPlayer({
      hand: [smithy],
      deck: deckCards,
      discard: [],
      playArea: [],
    });
    const state = createTestGameState({
      players: [player, createPlayer('p2', 'Bob', shuffle)],
      turnState: { actions: 1, buys: 1, coins: 0 },
    });

    const after = playActionCard(state, smithy.instanceId, shuffle);
    // Smithy: +3 cards, no custom effect
    expect(after.players[0].hand.length).toBe(3); // played 1, drew 3
    expect(after.turnState.actions).toBe(0);
    expect(after.pendingEffect).toBeNull();
  });
});
