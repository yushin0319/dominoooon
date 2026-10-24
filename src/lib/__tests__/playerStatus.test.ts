// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import type { PlayerState } from '../../types';
import { getPlayerStatus, groupCards } from '../playerStatus';

const mk = (names: string[]) =>
  names.map((n) => createCardInstance(getCardDef(n)));

function player(zones: {
  deck?: string[];
  hand?: string[];
  discard?: string[];
  playArea?: string[];
}): PlayerState {
  return {
    id: '0',
    name: 'あなた',
    deck: mk(zones.deck ?? []),
    hand: mk(zones.hand ?? []),
    discard: mk(zones.discard ?? []),
    playArea: mk(zones.playArea ?? []),
  };
}

describe('getPlayerStatus: 山札・捨て札の枚数と勝利点', () => {
  it('山札と捨て札の枚数を数える（手札・場のカードは入れない）', () => {
    const s = getPlayerStatus(
      player({
        deck: ['Copper', 'Copper', 'Estate'],
        hand: ['Copper', 'Silver'],
        discard: ['Gold', 'Estate', 'Copper', 'Copper'],
        playArea: ['Village'],
      }),
    );
    expect(s.deck).toBe(3);
    expect(s.discard).toBe(4);
  });

  it('勝利点は手札・山札・捨て札・場のすべてのカードで数える（結果画面と同じ数え方）', () => {
    const s = getPlayerStatus(
      player({
        deck: ['Estate'],
        hand: ['Duchy'],
        discard: ['Province', 'Curse'],
        playArea: [],
      }),
    );
    // 屋敷 1 + 公領 3 + 属州 6 + 呪い -1
    expect(s.vp).toBe(9);
  });

  it('庭園はデッキ全体の枚数で数える（10 枚につき 1 点）', () => {
    const s = getPlayerStatus(
      player({
        deck: Array(9).fill('Copper'),
        discard: ['Gardens', 'Copper', 'Copper'],
      }),
    );
    // 全 12 枚 → 庭園 1 点
    expect(s.vp).toBe(1);
  });

  it('カードが 1 枚も無くても 0 を返す', () => {
    expect(getPlayerStatus(player({}))).toEqual({
      deck: 0,
      discard: 0,
      vp: 0,
    });
  });
});

describe('groupCards: 捨て札の一覧（同じカードはまとめる）', () => {
  it('財宝 → 勝利点 → 呪い → アクションの順、同じ種類の中はコストの高い順に並べ、枚数をまとめる', () => {
    const groups = groupCards(
      mk([
        'Copper',
        'Estate',
        'Silver',
        'Copper',
        'Smithy',
        'Curse',
        'Gold',
        'Province',
        'Village',
        'Copper',
      ]),
    );
    expect(groups.map((g) => [g.nameJa, g.count, g.kind])).toEqual([
      ['金貨', 1, 'treasure'],
      ['銀貨', 1, 'treasure'],
      ['銅貨', 3, 'treasure'],
      ['属州', 1, 'victory'],
      ['屋敷', 1, 'victory'],
      ['呪い', 1, 'curse'],
      ['鍛冶屋', 1, 'action'],
      ['村', 1, 'action'],
    ]);
  });

  it('空なら空の一覧', () => {
    expect(groupCards([])).toEqual([]);
  });
});
