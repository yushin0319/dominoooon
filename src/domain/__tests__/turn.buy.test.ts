// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { createPlayer } from '../player';
import { createShuffleFn } from '../shuffle';
import { initializeSupply } from '../supply';
import {
  autoPlayTreasures,
  buyCard,
  canBuy,
  createInitialTurnState,
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
    const gained = after.players[0].discard.find(
      (c) => c.def.name === 'Market',
    );
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
    const marketBefore = state.supply.find(
      (p) => p.card.name === 'Market',
    )!.count;
    const after = buyCard(state, 'Market');
    const marketAfter = after.supply.find(
      (p) => p.card.name === 'Market',
    )!.count;
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

  it('throws when supply pile is empty', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    const emptySupply = state.supply.map((p) =>
      p.card.name === 'Market' ? { ...p, count: 0 } : p,
    );
    const emptyState = { ...state, supply: emptySupply };
    expect(() => buyCard(emptyState, 'Market')).toThrow(
      'サプライの山札が空です',
    );
  });

  it('throws when card name is not a valid card definition', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 10 },
    });
    expect(() => buyCard(state, 'NonExistentCard')).toThrow();
  });

  it('succeeds when coins exactly equal cost (boundary)', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    const after = buyCard(state, 'Market');
    expect(after.turnState.coins).toBe(0);
    expect(after.turnState.buys).toBe(0);
    const gained = after.players[0].discard.find(
      (c) => c.def.name === 'Market',
    );
    expect(gained).toBeDefined();
  });

  it('buying last card makes supply pile count 0', () => {
    const state = createTestGameState({
      phase: Phase.Buy,
      turnState: { actions: 0, buys: 1, coins: 5 },
    });
    const lastOneSupply = state.supply.map((p) =>
      p.card.name === 'Market' ? { ...p, count: 1 } : p,
    );
    const lastOneState = { ...state, supply: lastOneSupply };
    const after = buyCard(lastOneState, 'Market');
    const marketPile = after.supply.find((p) => p.card.name === 'Market');
    expect(marketPile?.count).toBe(0);
  });
});
