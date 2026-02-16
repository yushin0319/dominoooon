import type {
  GameState,
  PlayerState,
  CardInstance,
  ShuffleFn,
} from '../../types';
import { getCurrentPlayer } from '../game';
import { createShuffleFn } from '../shuffle';
import type { PendingEffectChoice } from './types';
import {
  resolveCouncilRoom,
  resolveLibrary,
  resolveMoneylender,
  resolveCellar,
  resolveChapel,
  resolveWorkshop,
  resolvePoacherOrPending,
  resolveHarbingerOrPending,
  resolvePoacher,
  resolveHarbinger,
} from './basic';
import {
  hasMoatReaction,
  resolveWitch,
  resolveBandit,
  resolveBureaucrat,
  resolveMilitia,
  resolveMilitiaChoice,
} from './attack';
import {
  resolveVassal,
  resolveSentry,
  createMinePending,
  createThroneRoomPending,
  resolveRemodel,
  resolveMine,
  resolveArtisan,
  resolveThroneRoom,
  resolveVassalChoice,
  resolveSentryChoice,
} from './complex';

// Re-export types and utilities
export type { PendingEffectChoice } from './types';
export { hasMoatReaction } from './attack';

const defaultShuffle = createShuffleFn();

// ===== Helpers =====

function createPending(
  state: GameState,
  type: string,
  card: CardInstance,
): GameState {
  const player = getCurrentPlayer(state);
  if (player.hand.length === 0) return state;
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
  type: string,
  card: CardInstance,
  data: Record<string, unknown>,
): GameState {
  const player = getCurrentPlayer(state);
  if (type !== 'artisan' && player.hand.length === 0) return state;
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

// ===== Public API =====

export function resolveCustomEffect(
  state: GameState,
  card: CardInstance,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  const custom = card.def.effects.custom;
  if (!custom) return state;

  switch (custom) {
    // Immediate resolvers
    case 'councilRoom':
      return resolveCouncilRoom(state, shuffleFn);
    case 'witch':
      return resolveWitch(state);
    case 'moneylender':
      return resolveMoneylender(state);
    case 'library':
      return resolveLibrary(state, shuffleFn);
    case 'bandit':
      return resolveBandit(state, shuffleFn);
    case 'bureaucrat':
      return resolveBureaucrat(state);
    // Merchant: basic effects (+1 card, +1 action) handled by applyBasicEffects.
    // TODO: Silver bonus (+1 coin on first Silver) to be handled in turn.ts autoPlayTreasures.
    case 'merchant':
      return state;
    case 'vassal':
      return resolveVassal(state, card, shuffleFn);
    case 'sentry':
      return resolveSentry(state, card, shuffleFn);
    // Conditional immediate/pending
    case 'poacher':
      return resolvePoacherOrPending(state, card);
    case 'harbinger':
      return resolveHarbingerOrPending(state, card);
    // PendingEffect creators
    case 'cellar':
      return createPending(state, 'cellar', card);
    case 'chapel':
      return createPending(state, 'chapel', card);
    case 'workshop':
      return createPending(state, 'workshop', card);
    case 'remodel':
      return createPendingWithData(state, 'remodel', card, { phase: 'trash' });
    case 'mine':
      return createMinePending(state, card);
    case 'artisan':
      return createPendingWithData(state, 'artisan', card, { phase: 'gain' });
    case 'militia':
      return resolveMilitia(state, card);
    case 'throneRoom':
      return createThroneRoomPending(state, card);
    default:
      // Exhaustive check
      const _exhaustive: never = custom;
      console.error(`Unknown effect: ${_exhaustive}`);
      return state;
  }
}

export function resolvePendingEffect(
  state: GameState,
  choice: PendingEffectChoice,
  shuffleFn: ShuffleFn = defaultShuffle,
): GameState {
  if (!state.pendingEffect) return state;

  switch (state.pendingEffect.type) {
    case 'cellar':
      return resolveCellar(state, choice, shuffleFn);
    case 'chapel':
      return resolveChapel(state, choice);
    case 'workshop':
      return resolveWorkshop(state, choice);
    case 'remodel':
      return resolveRemodel(state, choice);
    case 'mine':
      return resolveMine(state, choice);
    case 'artisan':
      return resolveArtisan(state, choice);
    case 'militia':
      return resolveMilitiaChoice(state, choice);
    case 'throneRoom':
      return resolveThroneRoom(state, choice, shuffleFn);
    case 'poacher':
      return resolvePoacher(state, choice);
    case 'harbinger':
      return resolveHarbinger(state, choice);
    case 'vassal':
      return resolveVassalChoice(state, choice, shuffleFn);
    case 'sentry':
      return resolveSentryChoice(state, choice);
    default:
      return { ...state, pendingEffect: null };
  }
}
