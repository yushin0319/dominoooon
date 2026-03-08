// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import {
  type PendingEffectChoice,
  resolveCustomEffect,
  resolvePendingEffect,
} from '../effect';
import { createPlayer } from '../player';
import { createShuffleFn } from '../shuffle';
import { initializeSupply } from '../supply';

const shuffle = createShuffleFn(() => 0.5);

function makePlayer(overrides?: Partial<PlayerState>): PlayerState {
  const base = createPlayer('p1', 'Alice', shuffle);
  return { ...base, ...overrides };
}

const defaultKingdom = [
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

function makeGameState(overrides?: Partial<GameState>): GameState {
  const players = [makePlayer(), createPlayer('p2', 'Bob', shuffle)];
  const base: GameState = {
    players,
    supply: initializeSupply(defaultKingdom, 2),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: { actions: 1, buys: 1, coins: 0 },
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [],
  };
  return { ...base, ...overrides };
}

// ===== PendingEffect creators + resolvers (basic cards) =====
describe('resolveCustomEffect + resolvePendingEffect', () => {
  describe('cellar', () => {
    it('creates pending, resolves by discarding and drawing', () => {
      const card = createCardInstance(getCardDef('Cellar'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const deck = Array(5)
        .fill(null)
        .map(() => createCardInstance(getCardDef('Copper')));
      const p1 = makePlayer({ hand: [c1, c2], deck, discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect).not.toBeNull();
      expect(withPending.pendingEffect!.type).toBe('cellar');

      const choice: PendingEffectChoice = {
        selectedCards: [c1.instanceId, c2.instanceId],
      };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      // Discarded 2, drew 2 => hand still has 2 (from deck)
      expect(after.players[0].hand).toHaveLength(2);
      expect(after.players[0].discard).toHaveLength(2);
    });
  });

  describe('chapel', () => {
    it('creates pending, resolves by trashing up to 4', () => {
      const card = createCardInstance(getCardDef('Chapel'));
      const c1 = createCardInstance(getCardDef('Copper'));
      const c2 = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [c1, c2] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('chapel');

      const choice: PendingEffectChoice = { selectedCards: [c1.instanceId] };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
      expect(after.trash).toHaveLength(1);
      expect(after.trash[0].def.name).toBe('Copper');
    });
  });

  describe('workshop', () => {
    it('creates pending, resolves by gaining card costing <=4', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const p1 = makePlayer({ discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('workshop');

      const choice: PendingEffectChoice = { selectedCardName: 'Silver' };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(
        after.players[0].discard.some((c) => c.def.name === 'Silver'),
      ).toBe(true);
    });

    it('ignores invalid card costing > 4', () => {
      const card = createCardInstance(getCardDef('Workshop'));
      const state = makeGameState();
      const withPending = resolveCustomEffect(state, card, shuffle);
      const choice: PendingEffectChoice = { selectedCardName: 'Market' };
      const after = resolvePendingEffect(withPending, choice, shuffle);
      // Should clear pending effect but not gain the invalid card
      expect(after.pendingEffect).toBeNull();
      expect(
        after.players[0].discard.some((c) => c.def.name === 'Market'),
      ).toBe(false);
    });
  });

  describe('remodel', () => {
    it('two-phase: trash then gain (cost +2)', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate')); // cost 2
      const p1 = makePlayer({ hand: [estate], discard: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      // Phase 1: create pending
      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('remodel');
      expect(withPending.pendingEffect!.data!.phase).toBe('trash');

      // Phase 2: trash estate
      const trashChoice: PendingEffectChoice = {
        selectedCards: [estate.instanceId],
      };
      const afterTrash = resolvePendingEffect(
        withPending,
        trashChoice,
        shuffle,
      );
      expect(afterTrash.pendingEffect!.data!.phase).toBe('gain');
      expect(afterTrash.trash).toHaveLength(1);

      // Phase 3: gain card costing <= 4 (estate cost 2 + 2)
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Smithy' }; // cost 4
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(
        after.players[0].discard.some((c) => c.def.name === 'Smithy'),
      ).toBe(true);
    });
  });

  describe('mine', () => {
    it('two-phase: trash Treasure then gain Treasure to hand (cost +3)', () => {
      const card = createCardInstance(getCardDef('Mine'));
      const copper = createCardInstance(getCardDef('Copper')); // cost 0
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('mine');

      // Trash Copper
      const trashChoice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      const afterTrash = resolvePendingEffect(
        withPending,
        trashChoice,
        shuffle,
      );
      expect(afterTrash.pendingEffect!.data!.phase).toBe('gain');

      // Gain Silver (cost 3 <= 0+3) to hand
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Silver' };
      const after = resolvePendingEffect(afterTrash, gainChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand.some((c) => c.def.name === 'Silver')).toBe(
        true,
      );
    });
  });

  describe('remodel: バリデーション', () => {
    it('trash phase: selectedCards が空の場合は pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const after = resolvePendingEffect(
        withPending,
        { selectedCards: [] },
        shuffle,
      );

      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
    });

    it('trash phase: 手札にないカードを選択した場合は pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate'));
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const after = resolvePendingEffect(
        withPending,
        { selectedCards: ['nonexistent-id'] },
        shuffle,
      );

      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand).toHaveLength(1);
    });

    it('gain phase: selectedCardName がない場合は pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate')); // cost 2
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const afterTrash = resolvePendingEffect(
        withPending,
        { selectedCards: [estate.instanceId] },
        shuffle,
      );
      const after = resolvePendingEffect(afterTrash, {}, shuffle);

      expect(after.pendingEffect).toBeNull();
    });

    it('gain phase: コスト上限を超えるカードは pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Remodel'));
      const estate = createCardInstance(getCardDef('Estate')); // cost 2、上限 2+2=4
      const p1 = makePlayer({ hand: [estate] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const afterTrash = resolvePendingEffect(
        withPending,
        { selectedCards: [estate.instanceId] },
        shuffle,
      );
      // Market: cost 5 > 4
      const after = resolvePendingEffect(
        afterTrash,
        { selectedCardName: 'Market' },
        shuffle,
      );

      expect(after.pendingEffect).toBeNull();
      expect(
        after.players[0].discard.some((c) => c.def.name === 'Market'),
      ).toBe(false);
    });
  });

  describe('mine: バリデーション', () => {
    it('trash phase: 非 Treasure カードを選択した場合は pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Mine'));
      const estate = createCardInstance(getCardDef('Estate')); // Victory（非 Treasure）
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [estate, copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      // Mine の pending は Treasure が手札にある場合のみ作成される（copper があるので作成される）
      // estate を選択 → Treasure でないので解除
      const after = resolvePendingEffect(
        withPending,
        { selectedCards: [estate.instanceId] },
        shuffle,
      );

      expect(after.pendingEffect).toBeNull();
    });

    it('gain phase: 非 Treasure カードを gain しようとした場合は pendingEffect を解除する', () => {
      const card = createCardInstance(getCardDef('Mine'));
      const copper = createCardInstance(getCardDef('Copper')); // cost 0
      const p1 = makePlayer({ hand: [copper] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      const afterTrash = resolvePendingEffect(
        withPending,
        { selectedCards: [copper.instanceId] },
        shuffle,
      );
      // Estate: Victory（非 Treasure）、cost 2 <= 3 だがタイプ違反
      const after = resolvePendingEffect(
        afterTrash,
        { selectedCardName: 'Estate' },
        shuffle,
      );

      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].hand.some((c) => c.def.name === 'Estate')).toBe(
        false,
      );
    });
  });

  describe('artisan', () => {
    it('two-phase: gain to hand then put one card on deck', () => {
      const card = createCardInstance(getCardDef('Artisan'));
      const copper = createCardInstance(getCardDef('Copper'));
      const p1 = makePlayer({ hand: [copper], deck: [] });
      const state = makeGameState({
        players: [p1, createPlayer('p2', 'Bob', shuffle)],
      });

      const withPending = resolveCustomEffect(state, card, shuffle);
      expect(withPending.pendingEffect!.type).toBe('artisan');
      expect(withPending.pendingEffect!.data!.phase).toBe('gain');

      // Gain Market (cost 5) to hand
      const gainChoice: PendingEffectChoice = { selectedCardName: 'Market' };
      const afterGain = resolvePendingEffect(withPending, gainChoice, shuffle);
      expect(afterGain.pendingEffect!.data!.phase).toBe('putBack');
      expect(
        afterGain.players[0].hand.some((c) => c.def.name === 'Market'),
      ).toBe(true);

      // Put Copper on deck top
      const putBackChoice: PendingEffectChoice = {
        selectedCards: [copper.instanceId],
      };
      const after = resolvePendingEffect(afterGain, putBackChoice, shuffle);
      expect(after.pendingEffect).toBeNull();
      expect(after.players[0].deck[0].def.name).toBe('Copper');
      expect(after.players[0].hand.every((c) => c.def.name !== 'Copper')).toBe(
        true,
      );
    });
  });
});
