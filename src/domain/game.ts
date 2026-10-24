import { CARD } from '../constants/cardNames';
import type { CardDef, GameState, PlayerState, ShuffleFn } from '../types';
import { Phase } from '../types';
import { CARD_DEFS } from './card';
import { calculateVP, createPlayer, getAllCards, getCardVP } from './player';
import {
  type GameEndReason,
  getGameEndReason,
  initializeSupply,
  isGameOver,
} from './supply';
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

/** 勝利点の内訳の 1 行（属州 ×4 = 24 点） */
export interface VPEntry {
  cardName: string;
  nameJa: string;
  count: number;
  /** 1 枚あたりの勝利点（庭園は持っているカードの枚数で変わる） */
  vpEach: number;
  vp: number;
}

/** 内訳にいつも出す行（持っていなくても 0 枚で出す。両者を見比べやすいように） */
const BASE_VP_ROWS: string[] = [CARD.PROVINCE, CARD.DUCHY, CARD.ESTATE];

function hasVP(def: CardDef): boolean {
  return def.vpValue !== undefined || def.vpCalculator !== undefined;
}

/** 勝利点の内訳（cardNames の順に 1 行ずつ。持っていないカードは 0 枚の行） */
export function getVPBreakdown(
  player: PlayerState,
  cardNames: string[],
): VPEntry[] {
  const all = getAllCards(player);
  return cardNames.map((cardName) => {
    const def = CARD_DEFS[cardName];
    const count = all.filter((c) => c.def.name === cardName).length;
    const vpEach = getCardVP(def, player);
    return { cardName, nameJa: def.nameJa, count, vpEach, vp: count * vpEach };
  });
}

/** この人が遊んだターン数。先手（0 番）から順に番が回る。turnNumber - 1 が遊び終えた番の合計 */
function getTurnsTaken(state: GameState, seat: number): number {
  const played = state.turnNumber - 1;
  return Math.max(0, Math.ceil((played - seat) / state.players.length));
}

export interface PlayerOutcome {
  playerId: string;
  name: string;
  vp: number;
  /** 遊んだターン数（同点のときはこれが少ない人の勝ち） */
  turns: number;
  /** 勝利点の内訳（GameOutcome.vpRows の順） */
  breakdown: VPEntry[];
}

export interface GameOutcome {
  /** 1 人が勝った / 引き分け（同点でターン数も同じ） */
  kind: 'win' | 'draw';
  /** 勝った人（引き分けなら並んだ全員） */
  winnerIds: string[];
  /** 勝利点が同点で、ターン数が少ない人の勝ちになった */
  decidedByTurns: boolean;
  /** 席の順（0 番 = 先手） */
  players: PlayerOutcome[];
  /** 内訳の行のカード名（属州・公領・屋敷と、どちらかが持っている勝利点のカード） */
  vpRows: string[];
  /** 遊んだラウンド数（両者のターンの合計ではない） */
  rounds: number;
  endReason: GameEndReason | null;
  /** 空になったサプライの山（日本語の名前） */
  emptyPiles: string[];
}

/**
 * ゲームの結果。勝敗はドミニオンのルールどおり: 勝利点が一番多い人の勝ち。
 * 同点なら、その中でターン数が少ない人の勝ち。ターン数も同じなら引き分け（勝ちを分け合う）。
 * 先手が自分の番でゲームを終わらせると、先手は後手より 1 ターン多く遊んでいる。
 */
export function getGameOutcome(state: GameState): GameOutcome {
  // 内訳の行: いつもの 3 種のあとに、誰かが持っている勝利点のカード（庭園・呪いなど）を高い点の順に
  const extra = new Map<string, number>();
  for (const player of state.players) {
    for (const { def } of getAllCards(player)) {
      if (hasVP(def) && !BASE_VP_ROWS.includes(def.name)) {
        extra.set(
          def.name,
          Math.max(extra.get(def.name) ?? -Infinity, getCardVP(def, player)),
        );
      }
    }
  }
  const vpRows = [
    ...BASE_VP_ROWS,
    ...[...extra].sort((a, b) => b[1] - a[1]).map(([name]) => name),
  ];

  const players: PlayerOutcome[] = state.players.map((player, seat) => {
    const breakdown = getVPBreakdown(player, vpRows);
    return {
      playerId: player.id,
      name: player.name,
      vp: calculateVP(player),
      turns: getTurnsTaken(state, seat),
      breakdown,
    };
  });

  const topVp = Math.max(...players.map((p) => p.vp));
  const tied = players.filter((p) => p.vp === topVp);
  const fewestTurns = Math.min(...tied.map((p) => p.turns));
  const winners = tied.filter((p) => p.turns === fewestTurns);

  return {
    kind: winners.length === 1 ? 'win' : 'draw',
    winnerIds: winners.map((p) => p.playerId),
    decidedByTurns: tied.length > 1 && winners.length === 1,
    players,
    vpRows,
    rounds: getPlayedRounds(state),
    endReason: getGameEndReason(state.supply),
    emptyPiles: state.supply
      .filter((p) => p.count === 0)
      .map((p) => p.card.nameJa),
  };
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
