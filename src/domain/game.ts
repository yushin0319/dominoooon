import type { GameState, PlayerState, CardDef, ShuffleFn } from '../types';
import { Phase } from '../types';
import { createPlayer, calculateVP } from './player';
import { initializeSupply, isGameOver } from './supply';
import { createInitialTurnState, cleanupAndDraw } from './turn';

export function createGame(
  playerNames: string[],
  kingdomCards: CardDef[],
  shuffleFn: ShuffleFn,
): GameState {
  const players = playerNames.map((name, i) =>
    createPlayer(String(i), name, shuffleFn),
  );

  return {
    players,
    supply: initializeSupply(kingdomCards, playerNames.length),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: createInitialTurnState(),
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: ['Game started'],
  };
}

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function endTurn(state: GameState, shuffleFn: ShuffleFn): GameState {
  const cleanedState = cleanupAndDraw(state, shuffleFn);
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  const newState: GameState = {
    ...cleanedState,
    currentPlayerIndex: nextIndex,
    turnNumber: state.turnNumber + 1,
  };

  return checkGameOver(newState);
}

export function checkGameOver(state: GameState): GameState {
  if (isGameOver(state.supply)) {
    return { ...state, gameOver: true };
  }
  return state;
}

export function getGameResults(
  state: GameState,
): { playerId: string; name: string; vp: number }[] {
  return state.players
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      vp: calculateVP(p),
    }))
    .sort((a, b) => b.vp - a.vp);
}

export function addLog(state: GameState, message: string): GameState {
  return { ...state, log: [...state.log, message] };
}

export function updatePlayer(
  state: GameState,
  playerIndex: number,
  updatedPlayer: PlayerState,
): GameState {
  const players = state.players.map((p, i) =>
    i === playerIndex ? updatedPlayer : p,
  );
  return { ...state, players };
}

export function updateCurrentPlayer(
  state: GameState,
  updatedPlayer: PlayerState,
): GameState {
  return updatePlayer(state, state.currentPlayerIndex, updatedPlayer);
}
