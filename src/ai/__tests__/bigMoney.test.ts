// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  bigMoneyAction,
  bigMoneyBuy,
  bigMoneyTurn,
  bigMoneyDecision,
} from '../bigMoney';
import { getCardDef } from '../../domain/card';
import { createPlayer } from '../../domain/player';
import { createGame } from '../../domain/game';
import { initializeSupply } from '../../domain/supply';
import { createShuffleFn } from '../../domain/shuffle';
import { Phase } from '../../types';
import type { GameState } from '../../types';

const shuffle = createShuffleFn(() => 0.5);

const kingdom = [
  getCardDef('Village'), getCardDef('Smithy'), getCardDef('Market'),
  getCardDef('Festival'), getCardDef('Laboratory'), getCardDef('Cellar'),
  getCardDef('Moat'), getCardDef('Militia'), getCardDef('Mine'),
  getCardDef('Witch'),
];

function makeTestState(coins: number, buys = 1): GameState {
  const p1 = createPlayer('p1', 'Alice', shuffle);
  const p2 = createPlayer('p2', 'Bob', shuffle);
  return {
    players: [p1, p2],
    supply: initializeSupply(kingdom, 2),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Buy,
    turnState: { actions: 0, buys, coins },
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [],
  };
}

describe('bigMoneyAction', () => {
  it('skips Action phase and advances to Buy', () => {
    const state = createGame(['Alice', 'Bob'], kingdom, shuffle);
    expect(state.phase).toBe(Phase.Action);

    const after = bigMoneyAction(state, shuffle);
    expect(after.phase).toBe(Phase.Buy);
  });
});

describe('bigMoneyBuy', () => {
  it('buys Province when coins >= 8', () => {
    const state = makeTestState(8);
    const after = bigMoneyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === 'Province');
    expect(gained).toBeDefined();
    expect(after.turnState.buys).toBe(0);
  });

  it('buys Gold when coins = 6-7', () => {
    const state = makeTestState(6);
    const after = bigMoneyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === 'Gold');
    expect(gained).toBeDefined();
  });

  it('buys Gold when coins = 7', () => {
    const state = makeTestState(7);
    const after = bigMoneyBuy(state);
    const gained = after.players[0].discard.find((c) => c.def.name === 'Gold');
    expect(gained).toBeDefined();
  });

  it('buys Silver when coins = 3-5', () => {
    for (const c of [3, 4, 5]) {
      const state = makeTestState(c);
      const after = bigMoneyBuy(state);
      const gained = after.players[0].discard.find((card) => card.def.name === 'Silver');
      expect(gained).toBeDefined();
    }
  });

  it('buys nothing when coins < 3', () => {
    for (const c of [0, 1, 2]) {
      const state = makeTestState(c);
      const after = bigMoneyBuy(state);
      expect(after.players[0].discard).toHaveLength(0);
    }
  });

  it('buys Gold when Province is sold out', () => {
    const state = makeTestState(8);
    // Empty Province pile
    const supply = state.supply.map((p) =>
      p.card.name === 'Province' ? { ...p, count: 0 } : p,
    );
    const after = bigMoneyBuy({ ...state, supply });
    const gained = after.players[0].discard.find((c) => c.def.name === 'Gold');
    expect(gained).toBeDefined();
  });

  it('handles multiple buys correctly', () => {
    // 2 buys, 11 coins: Province(8) + Silver(3)
    const state = makeTestState(11, 2);
    const after = bigMoneyBuy(state);
    const province = after.players[0].discard.filter((c) => c.def.name === 'Province');
    const silver = after.players[0].discard.filter((c) => c.def.name === 'Silver');
    expect(province).toHaveLength(1);
    expect(silver).toHaveLength(1);
    expect(after.turnState.buys).toBe(0);
  });
});

describe('bigMoneyTurn', () => {
  it('completes a full turn and switches to next player', () => {
    const state = createGame(['Alice', 'Bob'], kingdom, shuffle);
    expect(state.currentPlayerIndex).toBe(0);

    const after = bigMoneyTurn(state, shuffle);
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.turnNumber).toBe(2);
    expect(after.phase).toBe(Phase.Action);
  });
});

describe('bigMoneyDecision', () => {
  it('returns skip in Action phase', () => {
    const state = createGame(['Alice', 'Bob'], kingdom, shuffle);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('skip');
  });

  it('returns buy Province when coins >= 8', () => {
    const state = makeTestState(8);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('buy');
    expect(decision.cardName).toBe('Province');
  });

  it('returns buy Gold when coins = 6', () => {
    const state = makeTestState(6);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('buy');
    expect(decision.cardName).toBe('Gold');
  });

  it('returns buy Silver when coins = 3', () => {
    const state = makeTestState(3);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('buy');
    expect(decision.cardName).toBe('Silver');
  });

  it('returns skip when coins < 3 in Buy phase', () => {
    const state = makeTestState(2);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('skip');
  });

  it('returns skip when buys = 0', () => {
    const state = makeTestState(8, 0);
    const decision = bigMoneyDecision(state);
    expect(decision.action).toBe('skip');
  });
});
