// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { getCardDef } from '../../domain/card';
import { initializeSupply } from '../../domain/supply';
import type { SupplyPile } from '../../types';
import { getGameEndReasonText, getGameEndStatus } from '../gameEnd';

const kingdom = [
  'Cellar',
  'Chapel',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Mine',
  'Witch',
].map(getCardDef);

function supplyWith(counts: Record<string, number>): SupplyPile[] {
  return initializeSupply(kingdom, 2).map((p) =>
    p.card.name in counts ? { ...p, count: counts[p.card.name] } : p,
  );
}

describe('getGameEndStatus: ゲーム終了の近さ', () => {
  it('始めは属州 8・空の山 0 で、警告なし', () => {
    expect(getGameEndStatus(supplyWith({}))).toEqual({
      provincesLeft: 8,
      emptyPiles: 0,
      level: 'normal',
      reason: null,
    });
  });

  it('属州が 2 以下なら警告（near）', () => {
    expect(getGameEndStatus(supplyWith({ Province: 3 })).level).toBe('normal');
    expect(getGameEndStatus(supplyWith({ Province: 2 })).level).toBe('near');
  });

  it('空の山が 2 つなら警告（near）', () => {
    const s = getGameEndStatus(supplyWith({ Cellar: 0, Chapel: 0 }));
    expect(s.emptyPiles).toBe(2);
    expect(s.level).toBe('near');
  });

  it('属州が 0 なら終了（理由: 属州）', () => {
    const s = getGameEndStatus(supplyWith({ Province: 0 }));
    expect(s.level).toBe('end');
    expect(s.reason).toBe('province');
  });

  it('空の山が 3 つなら終了（理由: 空の山）', () => {
    const s = getGameEndStatus(
      supplyWith({ Cellar: 0, Chapel: 0, Village: 0 }),
    );
    expect(s.emptyPiles).toBe(3);
    expect(s.level).toBe('end');
    expect(s.reason).toBe('piles');
  });
});

describe('getGameEndReasonText: 終わった理由の文', () => {
  it('理由ごとの文', () => {
    expect(getGameEndReasonText('province')).toBe('属州の山がなくなりました');
    expect(getGameEndReasonText('piles')).toBe(
      'サプライの山が 3 つ空になりました',
    );
  });
});
