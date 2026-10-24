import type { AITurnStepKind } from '../ai/aiTurn';
import { getAvailableCards, getGameEndReason } from '../domain/supply';
import { canBuy, canPlayAction } from '../domain/turn';
import type { GameState, TurnState } from '../types';
import { Phase } from '../types';
import { getGameEndReasonText } from './gameEnd';

/** 人間のプレイヤーの番号（players[0]） */
const HUMAN_PLAYER_INDEX = 0;

/** ターン・フェーズのお知らせを出しておく時間（ms） */
export const NOTICE_MS = 1200;

/** ゲーム終了の理由を見せてから結果画面へ移るまでの時間（ms） */
export const GAME_OVER_DELAY_MS = 1500;

export const TURN_START_NOTICE = 'あなたのターン';
export const BUY_PHASE_NOTICE = '購入フェーズ';

/** AI の番になってから最初の段階を見せるまでの時間（ms） */
const AI_TURN_START_MS = 400;

/**
 * AI のターンの各段階を見せる時間（ms）。財宝を場に出す所は 1 秒ほど見せる。
 * 始まりの待ちと合わせて、アクションを使わないターンは 2.2 秒、使うターンは 2.9 秒（待たされすぎないよう 3 秒以内）
 */
const AI_STEP_MS: Record<AITurnStepKind, number> = {
  action: 700,
  treasure: 1000,
  buy: 800,
};

/** 動きを減らす設定（prefers-reduced-motion）のときに掛ける割合（全体で 1 秒ほどにする） */
const AI_REDUCED_MOTION_RATE = 0.3;

/** AI の番になってから最初の段階を見せるまでの時間 */
export function getAITurnStartMs(reducedMotion: boolean): number {
  return reducedMotion
    ? Math.round(AI_TURN_START_MS * AI_REDUCED_MOTION_RATE)
    : AI_TURN_START_MS;
}

/** AI のターンのその段階を見せておく時間 */
export function getAIStepMs(
  kind: AITurnStepKind,
  reducedMotion: boolean,
): number {
  const ms = AI_STEP_MS[kind];
  return reducedMotion ? Math.round(ms * AI_REDUCED_MOTION_RATE) : ms;
}

/**
 * 人間の番で、アクションフェーズにいるのに使えるアクションが無い（アクションが 0 か、手札にアクションカードが無い）。
 * このときは「アクションスキップ」を押させずに購入フェーズへ自動で進める。
 * 選択待ちの間・ゲーム終了後・AI の番は進めない。
 */
export function shouldAutoSkipActionPhase(state: GameState): boolean {
  return (
    state.currentPlayerIndex === HUMAN_PLAYER_INDEX &&
    !state.gameOver &&
    !state.pendingEffect &&
    state.phase === Phase.Action &&
    !canPlayAction(state)
  );
}

/**
 * 「ターン終了」の前に確認するか: 購入が残っていて、手持ちのコインで買えるカードが残っているとき。
 * コスト 0 のカード（銅貨・呪い）は数えない（コインが無くても買えるので、毎ターン確認が出てしまう）。
 */
export function needsConfirmToEndTurn(state: GameState): boolean {
  return (
    canBuy(state) &&
    getAvailableCards(state.supply, state.turnState.coins).some(
      (card) => card.cost > 0,
    )
  );
}

/** お知らせを決めるための、その時点のターンの様子 */
export interface TurnPoint {
  turnNumber: number;
  isHumanTurn: boolean;
  phase: Phase;
}

/**
 * ターン・フェーズが変わったときのお知らせ。
 * 自分の番になったら「あなたのターン」（自動で購入フェーズに進んでいてもこちら）、
 * 自分の番の中でアクション → 購入に進んだら「購入フェーズ」。それ以外は出さない。
 */
export function getTurnNotice(
  prev: TurnPoint | null,
  next: TurnPoint,
): string | null {
  if (!next.isHumanTurn) return null;
  if (
    prev === null ||
    !prev.isHumanTurn ||
    prev.turnNumber !== next.turnNumber
  ) {
    return TURN_START_NOTICE;
  }
  if (prev.phase === Phase.Action && next.phase === Phase.Buy) {
    return BUY_PHASE_NOTICE;
  }
  return null;
}

/** ターンを進めるボタン（アクションフェーズ → 購入フェーズ / 購入フェーズ → ターン終了） */
export type TurnAction = 'end-actions' | 'end-turn';

export const TURN_ACTION_LABEL: Record<TurnAction, string> = {
  'end-actions': '購入へ進む',
  'end-turn': 'ターン終了',
};

/** 一言の中でボタン名を指すときの書き方（「購入へ進む」） */
function quoted(action: TurnAction): string {
  return `「${TURN_ACTION_LABEL[action]}」`;
}

interface TurnActionConfirm {
  /** 押したときに確認を出すか（まだできることが残っていて、進むと戻れないとき） */
  needsConfirm: (state: GameState) => boolean;
  title: string;
  message: (turnState: TurnState) => string;
}

/** ターンを進めるボタンを押したときの確認 */
export const TURN_ACTION_CONFIRM: Record<TurnAction, TurnActionConfirm> = {
  'end-actions': {
    needsConfirm: canPlayAction,
    title: 'アクションカードがまだ使えます',
    message: () => '光っているカードをプレイせずに、購入へ進みますか？',
  },
  'end-turn': {
    needsConfirm: needsConfirmToEndTurn,
    title: 'まだ買えるカードがあります',
    message: (turnState) =>
      `残り ${turnState.coins} コイン・購入 ${turnState.buys} 回で買えるカードがあります。このままターンを終えますか？`,
  },
};

export interface TurnGuide {
  /** 次に何をすればよいかの一言 */
  message: string;
  /** 主ボタン（無ければ出さない） */
  action: TurnAction | null;
  /** 相手が考え中（ボタンを出さずに考え中の印を出す） */
  busy: boolean;
}

/** 手札のすぐ上の帯に出す一言と主ボタン */
export function getTurnGuide(state: GameState): TurnGuide {
  if (state.gameOver) {
    return { message: 'ゲーム終了', action: null, busy: false };
  }
  const humanId = state.players[HUMAN_PLAYER_INDEX]?.id;
  if (state.currentPlayerIndex !== HUMAN_PLAYER_INDEX) {
    return { message: 'AIが考えています...', action: null, busy: true };
  }
  if (state.pendingEffect) {
    return state.pendingEffect.playerId === humanId
      ? { message: '効果を選んでください', action: null, busy: false }
      : { message: 'AIが考えています...', action: null, busy: true };
  }
  if (state.phase === Phase.Action) {
    return {
      message: `光っているカードをプレイするか${quoted('end-actions')}`,
      action: 'end-actions',
      busy: false,
    };
  }
  if (state.phase === Phase.Buy) {
    const reason = getGameEndReason(state.supply);
    if (reason) {
      return {
        message: `${getGameEndReasonText(reason)}。ターンを終えるとゲーム終了です`,
        action: 'end-turn',
        busy: false,
      };
    }
    return {
      message:
        state.turnState.buys > 0
          ? `光っているカードを買うか${quoted('end-turn')}`
          : `購入はここまで。${quoted('end-turn')}へ`,
      action: 'end-turn',
      busy: false,
    };
  }
  return { message: '', action: null, busy: false };
}
