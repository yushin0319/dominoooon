import { describe, expect, it } from 'vitest';
import {
  getHandCardOverlap,
  HAND_CARD_WIDTH,
  HAND_MIN_OVERLAP,
  HAND_SIDE_MARGIN,
} from '../handLayout';

// 手札を横一列に並べたときの全体の幅（1 枚目以外は overlap 分だけ左に重なる）
function rowWidth(cardCount: number, overlap: number): number {
  return cardCount * HAND_CARD_WIDTH - (cardCount - 1) * overlap;
}

describe('getHandCardOverlap', () => {
  it('PC 幅（1366px）で手札 5 枚なら従来どおり 16px 重ねる', () => {
    expect(getHandCardOverlap(5, 1366)).toBe(HAND_MIN_OVERLAP);
    expect(HAND_MIN_OVERLAP).toBe(16);
  });

  it('スマホ幅（390px）で手札 5 枚なら重なりを増やして画面内に収める', () => {
    const overlap = getHandCardOverlap(5, 390);
    expect(overlap).toBeGreaterThan(HAND_MIN_OVERLAP);
    expect(rowWidth(5, overlap)).toBeLessThanOrEqual(390 - HAND_SIDE_MARGIN);
  });

  it('スマホ幅（390px）で手札 7 枚（鍛冶屋で +3 枚引いた後）でも画面内に収める', () => {
    const overlap = getHandCardOverlap(7, 390);
    expect(rowWidth(7, overlap)).toBeLessThanOrEqual(390 - HAND_SIDE_MARGIN);
  });

  it('手札が 0〜1 枚なら重なりは従来値のまま（0 除算しない）', () => {
    expect(getHandCardOverlap(0, 390)).toBe(HAND_MIN_OVERLAP);
    expect(getHandCardOverlap(1, 390)).toBe(HAND_MIN_OVERLAP);
  });

  it('極端に狭い画面で手札が多くても、各カードが 8px 以上見える重なりに抑える', () => {
    expect(getHandCardOverlap(20, 200)).toBe(HAND_CARD_WIDTH - 8);
  });
});
