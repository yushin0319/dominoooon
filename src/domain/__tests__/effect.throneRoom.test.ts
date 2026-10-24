// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { CardInstance, GameState, PlayerState } from '../../types';
import { Phase } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { resolveCustomEffect, resolvePendingEffect } from '../effect';
import { createPlayer } from '../player';
import { createShuffleFn } from '../shuffle';
import { initializeSupply } from '../supply';

const shuffle = createShuffleFn(() => 0.5);

const kingdom = [
  getCardDef('Village'),
  getCardDef('Smithy'),
  getCardDef('Workshop'),
  getCardDef('Remodel'),
  getCardDef('Militia'),
  getCardDef('Vassal'),
  getCardDef('Throne Room'),
  getCardDef('Chapel'),
  getCardDef('Market'),
  getCardDef('Cellar'),
];

function cards(...names: string[]): CardInstance[] {
  return names.map((n) => createCardInstance(getCardDef(n)));
}

function makeState(p1: Partial<PlayerState>, p2?: Partial<PlayerState>) {
  const base1 = createPlayer('p1', 'あなた', shuffle);
  const base2 = createPlayer('p2', 'AI', shuffle);
  const state: GameState = {
    players: [
      { ...base1, hand: [], deck: [], discard: [], playArea: [], ...p1 },
      { ...base2, ...p2 },
    ],
    supply: initializeSupply(kingdom, 2),
    trash: [],
    currentPlayerIndex: 0,
    phase: Phase.Action,
    turnState: { actions: 0, buys: 1, coins: 0 },
    pendingEffect: null,
    turnNumber: 1,
    gameOver: false,
    log: [],
  };
  return state;
}

/** 玉座の間をプレイして、手札の targetName を選んだ直後の状態を返す */
function playThroneRoomOn(state: GameState, targetName: string): GameState {
  const throne = createCardInstance(getCardDef('Throne Room'));
  const withPending = resolveCustomEffect(state, throne, shuffle);
  expect(withPending.pendingEffect?.type).toBe('throneRoom');
  const target = withPending.players[0].hand.find(
    (c) => c.def.name === targetName,
  );
  if (!target) throw new Error(`${targetName} が手札にない`);
  return resolvePendingEffect(
    withPending,
    { selectedCards: [target.instanceId] },
    shuffle,
  );
}

describe('玉座の間: 選択が要るアクションも 2 回使える', () => {
  it('工房を選ぶと、1 回目の獲得のあとに 2 回目の獲得の選択が出る', () => {
    const state = makeState({ hand: cards('Workshop', 'Copper') });

    const first = playThroneRoomOn(state, 'Workshop');
    expect(first.pendingEffect?.type).toBe('workshop');

    const second = resolvePendingEffect(
      first,
      { selectedCardName: 'Silver' },
      shuffle,
    );
    expect(second.pendingEffect?.type).toBe('workshop');

    const done = resolvePendingEffect(
      second,
      { selectedCardName: 'Village' },
      shuffle,
    );
    expect(done.pendingEffect).toBeNull();
    expect(done.players[0].discard.map((c) => c.def.name)).toEqual([
      'Silver',
      'Village',
    ]);
    // 工房は 1 枚だけ場に出る
    expect(done.players[0].playArea.map((c) => c.def.name)).toEqual([
      'Workshop',
    ]);
  });

  it('1 回目の獲得をしなくても 2 回目の選択は出る', () => {
    const state = makeState({ hand: cards('Workshop') });
    const first = playThroneRoomOn(state, 'Workshop');
    const second = resolvePendingEffect(first, {}, shuffle);
    expect(second.pendingEffect?.type).toBe('workshop');
  });

  it('ログに選んだカード名が出る', () => {
    const state = makeState({ hand: cards('Workshop') });
    const first = playThroneRoomOn(state, 'Workshop');
    expect(first.log.at(-1)).toContain('玉座の間で工房');
  });

  it('改築（2 段階）を選ぶと、廃棄→獲得を 2 回くり返す', () => {
    const state = makeState({ hand: cards('Remodel', 'Estate', 'Copper') });
    const trash1 = playThroneRoomOn(state, 'Remodel');
    expect(trash1.pendingEffect?.data?.phase).toBe('trash');

    const estate = trash1.players[0].hand.find((c) => c.def.name === 'Estate')!;
    const gain1 = resolvePendingEffect(
      trash1,
      { selectedCards: [estate.instanceId] },
      shuffle,
    );
    expect(gain1.pendingEffect?.data?.phase).toBe('gain');

    const trash2 = resolvePendingEffect(
      gain1,
      { selectedCardName: 'Silver' },
      shuffle,
    );
    expect(trash2.pendingEffect?.type).toBe('remodel');
    expect(trash2.pendingEffect?.data?.phase).toBe('trash');

    const copper = trash2.players[0].hand.find((c) => c.def.name === 'Copper')!;
    const gain2 = resolvePendingEffect(
      trash2,
      { selectedCards: [copper.instanceId] },
      shuffle,
    );
    const done = resolvePendingEffect(
      gain2,
      { selectedCardName: 'Cellar' },
      shuffle,
    );
    expect(done.pendingEffect).toBeNull();
    expect(done.trash.map((c) => c.def.name)).toEqual(['Estate', 'Copper']);
    expect(done.players[0].discard.map((c) => c.def.name)).toEqual([
      'Silver',
      'Cellar',
    ]);
  });

  it('民兵（相手の選択待ち）でも 2 回目が実行される', () => {
    const state = makeState(
      { hand: cards('Militia') },
      { hand: cards('Copper', 'Copper', 'Estate', 'Estate', 'Silver') },
    );
    const first = playThroneRoomOn(state, 'Militia');
    expect(first.pendingEffect?.type).toBe('militia');
    expect(first.turnState.coins).toBe(2);

    const ai = first.players[1];
    const done = resolvePendingEffect(
      first,
      { selectedCards: [ai.hand[2].instanceId, ai.hand[3].instanceId] },
      shuffle,
    );
    // 2 回目: +2 コイン。相手はすでに 3 枚なので選択待ちは出ない
    expect(done.pendingEffect).toBeNull();
    expect(done.turnState.coins).toBe(4);
    expect(done.players[1].hand).toHaveLength(3);
  });

  it('玉座の間に玉座の間: 2 回とも別のアクションを選べる', () => {
    const state = makeState({
      hand: cards('Throne Room', 'Village', 'Smithy'),
      deck: cards(
        'Copper',
        'Copper',
        'Copper',
        'Copper',
        'Copper',
        'Copper',
        'Copper',
        'Copper',
      ),
    });
    const pick1 = playThroneRoomOn(state, 'Throne Room');
    expect(pick1.pendingEffect?.type).toBe('throneRoom');

    const village = pick1.players[0].hand.find(
      (c) => c.def.name === 'Village',
    )!;
    const pick2 = resolvePendingEffect(
      pick1,
      { selectedCards: [village.instanceId] },
      shuffle,
    );
    // 村 ×2 のあと、2 回目の玉座の間の選択が出る
    expect(pick2.pendingEffect?.type).toBe('throneRoom');
    expect(pick2.turnState.actions).toBe(4);

    const smithy = pick2.players[0].hand.find((c) => c.def.name === 'Smithy')!;
    const done = resolvePendingEffect(
      pick2,
      { selectedCards: [smithy.instanceId] },
      shuffle,
    );
    expect(done.pendingEffect).toBeNull();
    // 村 2 回で 2 枚、鍛冶屋 2 回で 6 枚引く
    expect(done.players[0].hand).toHaveLength(8);
    expect(done.players[0].playArea.map((c) => c.def.name)).toEqual([
      'Throne Room',
      'Village',
      'Smithy',
    ]);
  });

  it('家臣でプレイしたカードの選択待ちのあとにも 2 回目の家臣が実行される', () => {
    const state = makeState({
      hand: cards('Vassal'),
      deck: cards('Workshop', 'Estate'),
    });
    const vassal1 = playThroneRoomOn(state, 'Vassal');
    expect(vassal1.pendingEffect?.type).toBe('vassal');

    // めくれた工房をプレイ → 工房の獲得
    const workshop = resolvePendingEffect(
      vassal1,
      { confirmed: true },
      shuffle,
    );
    expect(workshop.pendingEffect?.type).toBe('workshop');

    const done = resolvePendingEffect(
      workshop,
      { selectedCardName: 'Silver' },
      shuffle,
    );
    // 2 回目の家臣: 屋敷をめくって捨てるだけ（アクションでないので選択待ちなし）
    expect(done.pendingEffect).toBeNull();
    expect(done.turnState.coins).toBe(4);
    expect(done.players[0].discard.map((c) => c.def.name)).toEqual([
      'Silver',
      'Estate',
    ]);
  });
});
