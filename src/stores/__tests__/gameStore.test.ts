// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import { getCardDef, createCardInstance } from '../../domain/card';
import { Phase } from '../../types';

const kingdom = [
  getCardDef('Village'), getCardDef('Smithy'), getCardDef('Market'),
  getCardDef('Festival'), getCardDef('Laboratory'), getCardDef('Cellar'),
  getCardDef('Moat'), getCardDef('Militia'), getCardDef('Mine'),
  getCardDef('Witch'),
];

beforeEach(() => {
  // Reset store to initial state
  useGameStore.setState({
    page: 'title',
    gameState: null,
    aiStrategy: 'bigMoney',
    shuffleFn: useGameStore.getState().shuffleFn,
  });
});

describe('initial state', () => {
  it('starts with page=title and gameState=null', () => {
    const state = useGameStore.getState();
    expect(state.page).toBe('title');
    expect(state.gameState).toBeNull();
  });
});

describe('page navigation', () => {
  it('goToSetup changes page to setup', () => {
    useGameStore.getState().goToSetup();
    expect(useGameStore.getState().page).toBe('setup');
  });

  it('goToTitle changes page to title', () => {
    useGameStore.getState().goToSetup();
    useGameStore.getState().goToTitle();
    expect(useGameStore.getState().page).toBe('title');
  });
});

describe('startGame', () => {
  it('creates game and sets page to game', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const state = useGameStore.getState();
    expect(state.page).toBe('game');
    expect(state.gameState).not.toBeNull();
    expect(state.aiStrategy).toBe('bigMoney');
    expect(state.gameState!.players).toHaveLength(2);
    expect(state.gameState!.players[0].name).toBe('あなた');
    expect(state.gameState!.players[1].name).toBe('AI');
  });

  it('starts in Action phase with player 0', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    const gs = useGameStore.getState().gameState!;
    expect(gs.phase).toBe(Phase.Action);
    expect(gs.currentPlayerIndex).toBe(0);
  });
});

describe('isHumanTurn / isAITurn', () => {
  it('isHumanTurn returns true when currentPlayerIndex=0', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    expect(useGameStore.getState().isHumanTurn()).toBe(true);
    expect(useGameStore.getState().isAITurn()).toBe(false);
  });
});

describe('skipAction', () => {
  it('advances from Action to Buy phase', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Action);

    useGameStore.getState().skipAction();
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);
  });
});

describe('playAction', () => {
  it('plays an action card', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;
    const player = gs.players[0];

    // Give player a Village in hand for testing
    const village = createCardInstance(getCardDef('Village'));
    const deck = Array(3).fill(null).map(() => createCardInstance(getCardDef('Copper')));
    const modifiedPlayer = {
      ...player,
      hand: [village, ...player.hand],
      deck: [...deck, ...player.deck],
    };
    const modifiedState = {
      ...gs,
      players: [modifiedPlayer, gs.players[1]],
    };
    useGameStore.setState({ gameState: modifiedState });

    useGameStore.getState().playAction(village.instanceId);
    const after = useGameStore.getState().gameState!;
    expect(after.players[0].playArea.some((c) => c.instanceId === village.instanceId)).toBe(true);
    expect(after.turnState.actions).toBe(2); // 1 - 1 + 2 (Village)
  });
});

describe('buyCard', () => {
  it('buys a card and reduces coins/buys', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Set up Buy phase with enough coins
    const gs = useGameStore.getState().gameState!;
    useGameStore.setState({
      gameState: {
        ...gs,
        phase: Phase.Buy,
        turnState: { actions: 0, buys: 1, coins: 5 },
      },
    });

    useGameStore.getState().buyCard('Market');
    const after = useGameStore.getState().gameState!;
    expect(after.players[0].discard.some((c) => c.def.name === 'Market')).toBe(true);
    expect(after.turnState.coins).toBe(0);
    expect(after.turnState.buys).toBe(0);
  });
});

describe('skipBuy', () => {
  it('ends turn and moves to next player', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Move to Buy phase first
    useGameStore.getState().skipAction();
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);

    useGameStore.getState().skipBuy();
    const after = useGameStore.getState().gameState!;
    // After skipBuy: endTurn is called, next player
    expect(after.currentPlayerIndex).toBe(1);
    expect(after.phase).toBe(Phase.Action);
    expect(after.turnNumber).toBe(2);
  });
});

describe('executeAITurn', () => {
  it('executes AI turn with bigMoney strategy', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Skip human turn
    useGameStore.getState().skipAction();
    useGameStore.getState().skipBuy();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);

    useGameStore.getState().executeAITurn();
    const after = useGameStore.getState().gameState!;
    expect(after.currentPlayerIndex).toBe(0); // back to human
    expect(after.turnNumber).toBe(3);
  });

  it('executes AI turn with bigMoneySmithy strategy', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
    useGameStore.getState().skipAction();
    useGameStore.getState().skipBuy();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);

    useGameStore.getState().executeAITurn();
    const after = useGameStore.getState().gameState!;
    expect(after.currentPlayerIndex).toBe(0);
  });
});

describe('game over', () => {
  it('transitions to result page when game ends', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    // Empty Province pile to trigger game over
    const gs = useGameStore.getState().gameState!;
    const supply = gs.supply.map((p) =>
      p.card.name === 'Province' ? { ...p, count: 0 } : p,
    );
    useGameStore.setState({
      gameState: { ...gs, supply, phase: Phase.Buy },
    });

    useGameStore.getState().skipBuy();
    expect(useGameStore.getState().page).toBe('result');
  });
});

describe('resolvePending', () => {
  it('resolves a pending effect', () => {
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    const gs = useGameStore.getState().gameState!;

    // Simulate a chapel pending effect
    const copper = createCardInstance(getCardDef('Copper'));
    const modifiedPlayer = {
      ...gs.players[0],
      hand: [copper],
    };
    useGameStore.setState({
      gameState: {
        ...gs,
        players: [modifiedPlayer, gs.players[1]],
        pendingEffect: {
          type: 'chapel',
          sourceCard: getCardDef('Chapel'),
          playerId: '0',
        },
      },
    });

    useGameStore.getState().resolvePending({
      type: 'chapel',
      selectedCards: [copper.instanceId],
    });
    const after = useGameStore.getState().gameState!;
    expect(after.pendingEffect).toBeNull();
    expect(after.trash).toHaveLength(1);
  });
});
