// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getCardDef } from '../../domain/card';
import type { GameOutcome } from '../../domain/game';
import { initializeSupply } from '../../domain/supply';
import {
  getEndReasonDetail,
  getKingdomNames,
  getResultHeadline,
} from '../gameResult';

/** 2 人（0 = あなた、1 = AI）の結果 */
function outcome(over: Partial<GameOutcome>): GameOutcome {
  return {
    kind: 'win',
    winnerIds: ['0'],
    decidedByTurns: false,
    players: [
      { playerId: '0', name: 'あなた', vp: 30, turns: 12, breakdown: [] },
      { playerId: '1', name: 'AI', vp: 27, turns: 12, breakdown: [] },
    ],
    vpRows: [],
    rounds: 12,
    endReason: 'province',
    emptyPiles: ['属州'],
    ...over,
  };
}

describe('getResultHeadline: 結果画面の一言（あなたから見た勝ち負け）', () => {
  it('あなたの勝ち', () => {
    expect(getResultHeadline(outcome({}), '0')).toEqual({
      tone: 'win',
      title: 'あなたの勝ち！',
      note: null,
    });
  });

  it('あなたの負け', () => {
    expect(getResultHeadline(outcome({ winnerIds: ['1'] }), '0')).toMatchObject(
      { tone: 'lose', title: 'あなたの負け', note: null },
    );
  });

  it('同点でターン数が少ない方の勝ちになったときは、そう書く', () => {
    const o = outcome({
      winnerIds: ['1'],
      decidedByTurns: true,
      players: [
        { playerId: '0', name: 'あなた', vp: 27, turns: 12, breakdown: [] },
        { playerId: '1', name: 'AI', vp: 27, turns: 11, breakdown: [] },
      ],
    });
    expect(getResultHeadline(o, '0')).toEqual({
      tone: 'lose',
      title: 'あなたの負け',
      note: '勝利点は同点。ターン数が少ないAIの勝ちです（あなた 12 ターン / AI 11 ターン）',
    });
  });

  it('引き分け', () => {
    const o = outcome({ kind: 'draw', winnerIds: ['0', '1'] });
    expect(getResultHeadline(o, '0')).toEqual({
      tone: 'draw',
      title: '引き分け',
      note: '勝利点もターン数も同じなので引き分けです',
    });
  });
});

describe('getEndReasonDetail: 終わった理由', () => {
  it('属州の山が空', () => {
    expect(getEndReasonDetail(outcome({}))).toBe('属州の山がなくなりました');
  });

  it('山が 3 つ空なら、空になった山も書く', () => {
    expect(
      getEndReasonDetail(
        outcome({ endReason: 'piles', emptyPiles: ['屋敷', '村', '鍛冶屋'] }),
      ),
    ).toBe('サプライの山が 3 つ空になりました（屋敷・村・鍛冶屋）');
  });

  it('理由が分からない（途中のデータ）ときは null', () => {
    expect(getEndReasonDetail(outcome({ endReason: null }))).toBeNull();
  });
});

describe('getKingdomNames: 遊んだキングダム', () => {
  it('基本のサプライを除いたカードの日本語名（サプライの順）', () => {
    const supply = initializeSupply(
      ['Village', 'Smithy', 'Gardens'].map(getCardDef),
      2,
    );
    expect(getKingdomNames(supply)).toEqual(['村', '鍛冶屋', '庭園']);
  });
});
