// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { GameState, PlayerState } from '../../types';
import { createCardInstance, getCardDef } from '../card';
import { createGame, getGameOutcome, getVPBreakdown } from '../game';
import { calculateVP } from '../player';
import { createShuffleFn } from '../shuffle';

const shuffle = createShuffleFn(() => 0.5);

const kingdom = [
  'Village',
  'Smithy',
  'Market',
  'Festival',
  'Laboratory',
  'Cellar',
  'Moat',
  'Militia',
  'Gardens',
  'Witch',
].map(getCardDef);

/** カード名と枚数から、全部を山札に持った人を作る */
function withCards(
  player: PlayerState,
  cards: Record<string, number>,
): PlayerState {
  const deck = Object.entries(cards).flatMap(([name, n]) =>
    Array.from({ length: n }, () => createCardInstance(getCardDef(name))),
  );
  return { ...player, deck, hand: [], discard: [], playArea: [] };
}

/**
 * 終わったゲームを作る。turnNumber は終了判定のあとの値（最後に遊んだ番 + 1）。
 * あなたが先手なので、turnNumber が偶数（あなたの番で終わった）ならあなたが 1 ターン多い
 */
function finishedGame(opts: {
  you: Record<string, number>;
  ai: Record<string, number>;
  turnNumber: number;
  counts?: Record<string, number>;
}): GameState {
  const gs = createGame(['あなた', 'AI'], kingdom, shuffle);
  const counts = opts.counts ?? { Province: 0 };
  return {
    ...gs,
    players: [
      withCards(gs.players[0], opts.you),
      withCards(gs.players[1], opts.ai),
    ],
    supply: gs.supply.map((p) =>
      p.card.name in counts ? { ...p, count: counts[p.card.name] } : p,
    ),
    turnNumber: opts.turnNumber,
    currentPlayerIndex: (opts.turnNumber - 1) % 2,
    gameOver: true,
  };
}

describe('getVPBreakdown: 勝利点の内訳', () => {
  it('属州・公領・屋敷は持っていなくても 0 枚の行を出し、合計は calculateVP と同じ', () => {
    const gs = createGame(['あなた', 'AI'], kingdom, shuffle);
    const player = withCards(gs.players[0], {
      Province: 2,
      Estate: 3,
      Copper: 7,
    });
    const rows = getVPBreakdown(player, ['Province', 'Duchy', 'Estate']);
    expect(rows).toEqual([
      { cardName: 'Province', nameJa: '属州', count: 2, vpEach: 6, vp: 12 },
      { cardName: 'Duchy', nameJa: '公領', count: 0, vpEach: 3, vp: 0 },
      { cardName: 'Estate', nameJa: '屋敷', count: 3, vpEach: 1, vp: 3 },
    ]);
    expect(rows.reduce((sum, r) => sum + r.vp, 0)).toBe(calculateVP(player));
  });

  it('庭園は持っているカードの枚数で 1 枚あたりの点が変わる（24 枚なら 2 点）', () => {
    const gs = createGame(['あなた', 'AI'], kingdom, shuffle);
    const player = withCards(gs.players[0], {
      Gardens: 2,
      Copper: 22,
    });
    const [gardens] = getVPBreakdown(player, ['Gardens']);
    expect(gardens).toEqual({
      cardName: 'Gardens',
      nameJa: '庭園',
      count: 2,
      vpEach: 2,
      vp: 4,
    });
    expect(gardens.vp).toBe(calculateVP(player));
  });

  it('呪いはマイナスで数える', () => {
    const gs = createGame(['あなた', 'AI'], kingdom, shuffle);
    const player = withCards(gs.players[0], { Curse: 3, Copper: 7 });
    expect(getVPBreakdown(player, ['Curse'])).toEqual([
      { cardName: 'Curse', nameJa: '呪い', count: 3, vpEach: -1, vp: -3 },
    ]);
  });
});

describe('getGameOutcome: 勝敗（ドミニオンのルール: 勝利点が多い人の勝ち、同点ならターン数が少ない人の勝ち、それも同じなら引き分け）', () => {
  it('勝利点が多い人の勝ち', () => {
    const outcome = getGameOutcome(
      finishedGame({
        you: { Province: 4, Duchy: 1, Estate: 3 },
        ai: { Province: 4, Estate: 3 },
        turnNumber: 25,
      }),
    );
    expect(outcome.kind).toBe('win');
    expect(outcome.winnerIds).toEqual(['0']);
    expect(outcome.decidedByTurns).toBe(false);
    expect(outcome.players.map((p) => p.vp)).toEqual([30, 27]);
  });

  it('同点で、あなたの番で終わった（あなたが 1 ターン多い）なら、ターン数が少ない AI の勝ち', () => {
    // turnNumber 24 = 最後に遊んだのは通しの 23 番目（あなたの 12 回目）。あなた 12 ターン / AI 11 ターン
    const outcome = getGameOutcome(
      finishedGame({
        you: { Province: 4, Estate: 3 },
        ai: { Province: 4, Estate: 3 },
        turnNumber: 24,
      }),
    );
    expect(outcome.players.map((p) => p.turns)).toEqual([12, 11]);
    expect(outcome.kind).toBe('win');
    expect(outcome.winnerIds).toEqual(['1']);
    expect(outcome.decidedByTurns).toBe(true);
  });

  it('同点でターン数も同じなら引き分け（2 人とも勝ち）', () => {
    const outcome = getGameOutcome(
      finishedGame({
        you: { Province: 4, Estate: 3 },
        ai: { Province: 4, Estate: 3 },
        turnNumber: 25,
      }),
    );
    expect(outcome.players.map((p) => p.turns)).toEqual([12, 12]);
    expect(outcome.kind).toBe('draw');
    expect(outcome.winnerIds).toEqual(['0', '1']);
    expect(outcome.decidedByTurns).toBe(false);
  });

  it('ラウンド数は遊んだラウンド（両者の合計の「ターン数: 24」ではない）', () => {
    const outcome = getGameOutcome(
      finishedGame({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 }),
    );
    expect(outcome.rounds).toBe(12);
    expect(
      getGameOutcome(
        finishedGame({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 24 }),
      ).rounds,
    ).toBe(12);
  });

  it('終わった理由: 属州の山が空', () => {
    const outcome = getGameOutcome(
      finishedGame({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 }),
    );
    expect(outcome.endReason).toBe('province');
    expect(outcome.emptyPiles).toEqual(['属州']);
  });

  it('終わった理由: 山が 3 つ空（空になった山の名前も返す）', () => {
    const outcome = getGameOutcome(
      finishedGame({
        you: { Estate: 3 },
        ai: { Estate: 3 },
        turnNumber: 31,
        counts: { Estate: 0, Village: 0, Smithy: 0 },
      }),
    );
    expect(outcome.endReason).toBe('piles');
    expect(outcome.emptyPiles).toEqual(['屋敷', '村', '鍛冶屋']);
  });

  it('内訳の行は両者で揃える（属州・公領・屋敷のほか、どちらかが持っている庭園・呪い）', () => {
    const outcome = getGameOutcome(
      finishedGame({
        you: { Province: 3, Gardens: 1, Copper: 16 },
        ai: { Province: 2, Curse: 2, Copper: 10 },
        turnNumber: 25,
      }),
    );
    expect(outcome.vpRows).toEqual([
      'Province',
      'Duchy',
      'Estate',
      'Gardens',
      'Curse',
    ]);
    for (const p of outcome.players) {
      expect(p.breakdown.map((r) => r.cardName)).toEqual(outcome.vpRows);
      expect(p.breakdown.reduce((sum, r) => sum + r.vp, 0)).toBe(p.vp);
    }
    expect(outcome.players[0].vp).toBe(18 + 2);
    expect(outcome.players[1].vp).toBe(12 - 2);
  });
});
