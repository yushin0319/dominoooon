import type { CardDef, GameState, PlayerState, ShuffleFn } from '../types';
import { Phase } from '../types';
import { calculateVP, createPlayer } from './player';
import { initializeSupply, isGameOver } from './supply';
import { cleanupAndDraw, createInitialTurnState } from './turn';

/** ゲームログの最初の行 */
export const GAME_START_LOG = 'ゲーム開始';

/**
 * ラウンド（全員が 1 回ずつ番を終えると 1 ラウンド）。turnNumber は全員の通し番号（1 から）。
 * 2 人なら通しの 1・2 がラウンド 1、3・4 がラウンド 2（自分の 2 回目の番が「3」と出ていた）
 */
export function getRoundNumber(
  turnNumber: number,
  playerCount: number,
): number {
  return Math.max(1, Math.ceil(turnNumber / Math.max(1, playerCount)));
}

/**
 * 遊んだラウンド数（結果画面用）。ゲーム終了の判定はターンの終わり（endTurn）なので、
 * 終わったときの turnNumber はもう次の番に進んでいる。最後に遊んだ番（turnNumber - 1）のラウンドを返す
 */
export function getPlayedRounds(state: {
  turnNumber: number;
  gameOver: boolean;
  players: readonly unknown[];
}): number {
  const lastTurn = state.gameOver ? state.turnNumber - 1 : state.turnNumber;
  return getRoundNumber(lastTurn, state.players.length);
}

const TURN_HEADER = /^--- (.+) ---$/;

/** ゲームログのターンの区切りの行（「--- ラウンド 2: あなたのターン ---」） */
export function formatTurnHeader(round: number, playerName: string): string {
  return `--- ラウンド ${round}: ${playerName}のターン ---`;
}

/** ログの行がターンの区切りなら、その中身（「ラウンド 2: あなたのターン」）を返す。ほかの行は null */
export function parseTurnHeader(entry: string): string | null {
  return entry.match(TURN_HEADER)?.[1] ?? null;
}

/** 今の番の人のターンの区切りをログに足す */
function addTurnHeader(state: GameState): GameState {
  const round = getRoundNumber(state.turnNumber, state.players.length);
  return addLog(
    state,
    formatTurnHeader(round, state.players[state.currentPlayerIndex].name),
  );
}

export function createGame(
  playerNames: string[],
  kingdomCards: CardDef[],
  shuffleFn: ShuffleFn,
): GameState {
  const players = playerNames.map((name, i) =>
    createPlayer(String(i), name, shuffleFn),
  );

  return addTurnHeader({
    players,
    supply: initializeSupply(kingdomCards, playerNames.length),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: createInitialTurnState(),
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [GAME_START_LOG],
  });
}

export function getCurrentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function endTurn(state: GameState, shuffleFn: ShuffleFn): GameState {
  const cleanedState = cleanupAndDraw(state, shuffleFn);
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  const newState = checkGameOver({
    ...cleanedState,
    currentPlayerIndex: nextIndex,
    turnNumber: state.turnNumber + 1,
  });
  // 次の人のターンの区切り（自分の番にも AI の番にも入れる）。終わったゲームには入れない
  return newState.gameOver ? newState : addTurnHeader(newState);
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
