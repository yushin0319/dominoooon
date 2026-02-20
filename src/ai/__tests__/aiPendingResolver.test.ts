// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { resolveAIPendingEffect } from '../aiPendingResolver';
import { getCardDef, createCardInstance } from '../../domain/card';
import { createPlayer } from '../../domain/player';
import { createShuffleFn } from '../../domain/shuffle';
import type { PendingEffect, PlayerState } from '../../types';
import type { PendingEffectChoice } from '../../domain/effect';

const shuffle = createShuffleFn(() => 0.5);

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

function makeMilitiaPending(playerId: string): PendingEffect {
  return {
    type: 'militia',
    sourceCard: getCardDef('Militia'),
    playerId,
  };
}

describe('resolveAIPendingEffect', () => {
  describe('militia', () => {
    it('discards excess cards from hand end (5 → 3)', () => {
      const hand = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const player = makePlayer({ id: 'p1', hand });
      const pending = makeMilitiaPending('p1');
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      expect(resolvePending).toHaveBeenCalledOnce();
      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      expect(choice.selectedCards).toHaveLength(2);
      // Should discard last 2 cards
      expect(choice.selectedCards).toEqual([hand[3].instanceId, hand[4].instanceId]);
    });

    it('discards 1 card when hand has 4 cards', () => {
      const hand = Array(4).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const player = makePlayer({ id: 'p1', hand });
      const pending = makeMilitiaPending('p1');
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      expect(choice.selectedCards).toHaveLength(1);
      expect(choice.selectedCards).toEqual([hand[3].instanceId]);
    });

    it('discards 3 cards when hand has 6 cards', () => {
      const hand = Array(6).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const player = makePlayer({ id: 'p1', hand });
      const pending = makeMilitiaPending('p1');
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      expect(choice.selectedCards).toHaveLength(3);
    });
  });

  describe('non-militia pending', () => {
    it('resolves with empty selectedCards for cellar', () => {
      const player = makePlayer({ id: 'p1' });
      const pending: PendingEffect = {
        type: 'cellar',
        sourceCard: getCardDef('Cellar'),
        playerId: 'p1',
      };
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      expect(resolvePending).toHaveBeenCalledOnce();
      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      expect(choice.selectedCards).toEqual([]);
    });

    it('resolves with empty selectedCards for chapel', () => {
      const player = makePlayer({ id: 'p1' });
      const pending: PendingEffect = {
        type: 'chapel',
        sourceCard: getCardDef('Chapel'),
        playerId: 'p1',
      };
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      expect(choice.selectedCards).toEqual([]);
    });
  });

  describe('player not found', () => {
    it('does not call resolvePending when playerId not found', () => {
      const player = makePlayer({ id: 'p1' });
      const pending = makeMilitiaPending('p99');
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [player], resolvePending);

      expect(resolvePending).not.toHaveBeenCalled();
    });
  });

  describe('finds correct player among multiple', () => {
    it('resolves for the correct target player', () => {
      const hand = Array(5).fill(null).map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ id: 'p1', hand: [createCardInstance(getCardDef('Copper'))] });
      const p2 = makePlayer({ id: 'p2', hand });
      const pending = makeMilitiaPending('p2');
      const resolvePending = vi.fn();

      resolveAIPendingEffect(pending, [p1, p2], resolvePending);

      const choice = resolvePending.mock.calls[0][0] as PendingEffectChoice;
      // Should discard 2 from p2 (hand=5), not p1
      expect(choice.selectedCards).toHaveLength(2);
      expect(choice.selectedCards).toEqual([hand[3].instanceId, hand[4].instanceId]);
    });
  });
});
