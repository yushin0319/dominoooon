// Function names are intentionally verbose for clarity in this domain-heavy module.
// e.g., resolveMilitiaChoice clearly indicates it handles the Militia's pending choice resolution.
// This verbosity improves code readability and reduces ambiguity in game logic.

import type {
  CardInstance,
  GameState,
  PendingContinuation,
  PendingEffectType,
  ShuffleFn,
} from '../../types';
import { getCurrentPlayer } from '../game';
import { createShuffleFn } from '../shuffle';
import {
  resolveBandit,
  resolveBureaucrat,
  resolveMilitia,
  resolveMilitiaChoice,
  resolveWitch,
} from './attack';
import {
  resolveCellar,
  resolveChapel,
  resolveCouncilRoom,
  resolveHarbinger,
  resolveHarbingerOrPending,
  resolveLibrary,
  resolveMoneylender,
  resolvePoacher,
  resolvePoacherOrPending,
  resolveWorkshop,
} from './basic';
import {
  createMinePending,
  createThroneRoomPending,
  playCardTimes,
  resolveArtisan,
  resolveMine,
  resolveRemodel,
  resolveSentry,
  resolveSentryChoice,
  resolveThroneRoom,
  resolveVassal,
  resolveVassalChoice,
} from './complex';
import type { PendingEffectChoice } from './types';

export { hasMoatReaction } from './attack';
// Re-export types and utilities
export type { PendingEffectChoice } from './types';

const defaultShuffle = createShuffleFn();

// ===== Helpers =====

/** 手札を使わない（手札が空でも選択が要る）選択待ち */
const HAND_FREE_PENDING: ReadonlySet<PendingEffectType> = new Set([
  'workshop',
  'artisan',
]);

function createPending(
  state: GameState,
  type: PendingEffectType,
  card: CardInstance,
): GameState {
  const player = getCurrentPlayer(state);
  if (!HAND_FREE_PENDING.has(type) && player.hand.length === 0) return state;
  return {
    ...state,
    pendingEffect: {
      type,
      sourceCard: card.def,
      playerId: player.id,
    },
  };
}

function createPendingWithData(
  state: GameState,
  type: PendingEffectType,
  card: CardInstance,
  data: Record<string, unknown>,
): GameState {
  const player = getCurrentPlayer(state);
  if (!HAND_FREE_PENDING.has(type) && player.hand.length === 0) return state;
  return {
    ...state,
    pendingEffect: {
      type,
      sourceCard: card.def,
      playerId: player.id,
      data,
    },
  };
}

// ===== Handler Maps =====

type CustomEffectResolver = (
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn,
) => GameState;

type PendingEffectResolver = (
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn,
) => GameState;

/** カスタムエフェクト → 即時解決ハンドラーマップ */
const CUSTOM_EFFECT_HANDLERS: Record<
  NonNullable<CardInstance['def']['effects']['custom']>,
  CustomEffectResolver
> = {
  // 即時解決
  councilRoom: (s, _c, sf) => resolveCouncilRoom(s, sf),
  witch: (s) => resolveWitch(s),
  moneylender: (s) => resolveMoneylender(s),
  library: (s, _c, sf) => resolveLibrary(s, sf),
  bandit: (s, _c, sf) => resolveBandit(s, sf),
  bureaucrat: (s) => resolveBureaucrat(s),
  // Merchant: +1 card/+1 action は applyBasicEffects で処理。Silver bonus は turn.ts で処理。
  merchant: (s) => s,
  vassal: (s, c, sf) => resolveVassal(s, c, sf),
  sentry: (s, c, sf) => resolveSentry(s, c, sf),
  // 条件付き即時/pending
  poacher: (s, c) => resolvePoacherOrPending(s, c),
  harbinger: (s, c) => resolveHarbingerOrPending(s, c),
  // PendingEffect 生成
  cellar: (s, c) => createPending(s, 'cellar', c),
  chapel: (s, c) => createPending(s, 'chapel', c),
  workshop: (s, c) => createPending(s, 'workshop', c),
  remodel: (s, c) => createPendingWithData(s, 'remodel', c, { phase: 'trash' }),
  mine: (s, c) => createMinePending(s, c),
  artisan: (s, c) => createPendingWithData(s, 'artisan', c, { phase: 'gain' }),
  militia: (s, c) => resolveMilitia(s, c),
  throneRoom: (s, c) => createThroneRoomPending(s, c),
};

/** PendingEffect 解決ハンドラーマップ */
const PENDING_EFFECT_HANDLERS: Record<
  PendingEffectType,
  PendingEffectResolver
> = {
  cellar: (s, ch, sf) => resolveCellar(s, ch, sf),
  chapel: (s, ch) => resolveChapel(s, ch),
  workshop: (s, ch) => resolveWorkshop(s, ch),
  remodel: (s, ch) => resolveRemodel(s, ch),
  mine: (s, ch) => resolveMine(s, ch),
  artisan: (s, ch) => resolveArtisan(s, ch),
  militia: (s, ch) => resolveMilitiaChoice(s, ch),
  throneRoom: (s, ch, sf) => resolveThroneRoom(s, ch, sf),
  poacher: (s, ch) => resolvePoacher(s, ch),
  harbinger: (s, ch) => resolveHarbinger(s, ch),
  vassal: (s, ch, sf) => resolveVassalChoice(s, ch, sf),
  sentry: (s, ch) => resolveSentryChoice(s, ch),
};

// ===== Public API =====

/** 選択待ちの種類として知っているものか（保存データの確認用。解決のしかたがある種類だけ） */
export function isPendingEffectType(type: unknown): type is PendingEffectType {
  return (
    typeof type === 'string' && Object.hasOwn(PENDING_EFFECT_HANDLERS, type)
  );
}

export function resolveCustomEffect(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  const custom = card.def.effects.custom;
  if (!custom) return state;
  return CUSTOM_EFFECT_HANDLERS[custom](state, card, shuffleFn);
}

export function resolvePendingEffect(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (!state.pendingEffect) return state;
  const handler = PENDING_EFFECT_HANDLERS[state.pendingEffect.type];
  if (!handler) return { ...state, pendingEffect: null };

  // 続き（玉座の間の残りの使用）は外してから解決し、解決後に引き継ぐ
  const { continuation, ...pending } = state.pendingEffect;
  const result = handler(
    { ...state, pendingEffect: pending },
    choice,
    shuffleFn,
  );
  if (!continuation || continuation.length === 0) return result;
  return continueAfterPending(result, continuation, shuffleFn);
}

/**
 * 選択待ちを 1 つ解決したあとの続き。
 * まだ選択待ちがある（同じカードの次の段階 / 新しく出た選択）ならその後ろに続きを積み、
 * 無ければ続きを先頭から実行する。
 */
function continueAfterPending(
  state: GameState,
  continuation: PendingContinuation[],
  shuffleFn: ShuffleFn,
): GameState {
  if (state.pendingEffect) {
    return {
      ...state,
      pendingEffect: {
        ...state.pendingEffect,
        continuation: [
          ...(state.pendingEffect.continuation ?? []),
          ...continuation,
        ],
      },
    };
  }

  const [next, ...rest] = continuation;
  const result = playCardTimes(state, next.card, next.remaining, shuffleFn);
  if (rest.length === 0) return result;
  return continueAfterPending(result, rest, shuffleFn);
}
