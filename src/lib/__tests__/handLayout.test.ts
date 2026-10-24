import { describe, expect, it } from 'vitest';
import {
  getHandLayout,
  HAND_CARD_HEIGHT,
  HAND_CARD_WIDTH,
  HAND_MIN_OVERLAP,
  HAND_ROW_SIDE_MARGIN,
  HAND_SIDE_MARGIN,
  HOVER_LIFT,
  MIN_TOUCH_STRIP,
} from '../handLayout';

// 手札を横一列に並べたときの全体の幅（1 枚目以外は overlap 分だけ左に重なる）
function rowWidth(cardCount: number, overlap: number): number {
  return cardCount * HAND_CARD_WIDTH - (cardCount - 1) * overlap;
}

// 傾けたカードの、列の上端から見た一番下の位置（回転の外接矩形の下端 + 下げた量）
function visualBottom(pose: { rotate: number; y: number }): number {
  const rad = (Math.abs(pose.rotate) * Math.PI) / 180;
  const halfHeight =
    (HAND_CARD_HEIGHT * Math.cos(rad) + HAND_CARD_WIDTH * Math.sin(rad)) / 2;
  return HAND_CARD_HEIGHT / 2 + pose.y + halfHeight;
}

describe('getHandLayout: PC 幅（扇形）', () => {
  it('1366px で 5 枚なら、従来どおり 16px 重ね・5 度ずつ傾け・6px ずつ下げる（PC の 5 枚の見た目は変えない）', () => {
    const layout = getHandLayout(5, 1366);
    expect(layout.mode).toBe('fan');
    expect(layout.overlap).toBe(HAND_MIN_OVERLAP);
    expect(HAND_MIN_OVERLAP).toBe(16);
    expect(layout.poses.map((p) => p.rotate)).toEqual([-10, -5, 0, 5, 10]);
    expect(layout.poses.map((p) => p.y)).toEqual([12, 6, 0, 6, 12]);
    expect(layout.scrollable).toBe(false);
  });

  it('1366px で 9 枚でも、端のカードの傾きは 10 度・下げる量は 12px まで（5 枚のときと同じ広がり）', () => {
    const layout = getHandLayout(9, 1366);
    expect(layout.mode).toBe('fan');
    const maxRotate = Math.max(...layout.poses.map((p) => Math.abs(p.rotate)));
    const maxY = Math.max(...layout.poses.map((p) => p.y));
    expect(maxRotate).toBe(10);
    expect(maxY).toBe(12);
  });

  it('列の高さは傾けたカードの一番下まで含む（手札の欄の下でコストの丸が切れない）', () => {
    for (const count of [1, 2, 3, 5, 9, 12]) {
      const layout = getHandLayout(count, 1366);
      for (const pose of layout.poses) {
        expect(visualBottom(pose)).toBeLessThanOrEqual(layout.rowHeight);
      }
    }
  });

  it('扇形の列の高さは枚数によらず同じ（カードを出し入れしても欄の高さが変わらない）', () => {
    const heights = [1, 3, 5, 9].map((n) => getHandLayout(n, 1366).rowHeight);
    expect(new Set(heights).size).toBe(1);
    expect(heights[0]).toBeGreaterThan(HAND_CARD_HEIGHT);
  });

  it('扇形ではホバーしたカードを一番手前に出す（重なりが 16px だけなので隣を大きく隠さない）', () => {
    expect(getHandLayout(5, 1366).raiseOnHover).toBe(true);
  });

  it('5 枚が扇形で収まる最小の幅はちょうど 600px（境界値）', () => {
    const needed = rowWidth(5, HAND_MIN_OVERLAP) + HAND_SIDE_MARGIN;
    expect(needed).toBe(600);
    expect(getHandLayout(5, 600).mode).toBe('fan');
    expect(getHandLayout(5, 599).mode).toBe('row');
  });

  it('手札が 0〜1 枚でも壊れない（0 除算しない）', () => {
    expect(getHandLayout(0, 390).poses).toEqual([]);
    const one = getHandLayout(1, 390);
    expect(one.poses).toEqual([{ rotate: 0, y: 0 }]);
    expect(Number.isFinite(one.overlap)).toBe(true);
  });
});

describe('getHandLayout: 狭い幅（傾けずに一列）', () => {
  it('390px で 5 枚なら、傾けずに並べ、各カードの見える帯は 44px 以上で、画面内に収まる', () => {
    const layout = getHandLayout(5, 390);
    expect(layout.mode).toBe('row');
    expect(layout.poses.every((p) => p.rotate === 0 && p.y === 0)).toBe(true);
    expect(HAND_CARD_WIDTH - layout.overlap).toBeGreaterThanOrEqual(
      MIN_TOUCH_STRIP,
    );
    expect(rowWidth(5, layout.overlap)).toBeLessThanOrEqual(
      390 - HAND_ROW_SIDE_MARGIN,
    );
    expect(layout.scrollable).toBe(false);
  });

  it('390px で 9 枚なら、帯は 44px を保ち、収まらない分は横スクロールにする', () => {
    const layout = getHandLayout(9, 390);
    expect(layout.mode).toBe('row');
    expect(HAND_CARD_WIDTH - layout.overlap).toBe(MIN_TOUCH_STRIP);
    expect(MIN_TOUCH_STRIP).toBe(44);
    expect(layout.scrollable).toBe(true);
  });

  it('768px（タブレット）で 9 枚なら、傾けずに並べて画面内に収める（スクロールしない）', () => {
    const layout = getHandLayout(9, 768);
    expect(layout.mode).toBe('row');
    expect(rowWidth(9, layout.overlap)).toBeLessThanOrEqual(
      768 - HAND_ROW_SIDE_MARGIN,
    );
    expect(layout.scrollable).toBe(false);
  });

  it('一列のときはホバーしても手前に出さない（右隣の見えている帯を覆わない）', () => {
    expect(getHandLayout(5, 390).raiseOnHover).toBe(false);
    expect(getHandLayout(9, 390).raiseOnHover).toBe(false);
  });

  it('一列の高さはカードの高さ + 持ち上げ分（スクロール領域の上で持ち上げたカードが切れない）', () => {
    expect(getHandLayout(5, 390).rowHeight).toBeGreaterThanOrEqual(
      HAND_CARD_HEIGHT + HOVER_LIFT,
    );
  });
});
