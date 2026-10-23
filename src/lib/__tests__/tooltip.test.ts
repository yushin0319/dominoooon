import { describe, expect, it } from 'vitest';
import { getTooltipShiftX, TOOLTIP_EDGE_MARGIN } from '../tooltip';

describe('getTooltipShiftX', () => {
  it('ツールチップが画面内に収まっていればずらさない（PC 幅の通常表示）', () => {
    expect(getTooltipShiftX(333, 589, 1366)).toBe(0);
  });

  it('左端からはみ出すときは、左端が余白の位置に来るよう右へずらす', () => {
    // スマホ幅 390px で左端のカード（中心 x=93）に幅 256px のツールチップ
    expect(getTooltipShiftX(-35, 221, 390)).toBe(TOOLTIP_EDGE_MARGIN + 35);
  });

  it('右端からはみ出すときは、右端が余白の位置に来るよう左へずらす', () => {
    expect(getTooltipShiftX(205, 461, 390)).toBe(
      390 - TOOLTIP_EDGE_MARGIN - 461,
    );
  });

  it('ちょうど余白の位置にあるときはずらさない（境界値）', () => {
    expect(
      getTooltipShiftX(TOOLTIP_EDGE_MARGIN, 390 - TOOLTIP_EDGE_MARGIN, 390),
    ).toBe(0);
  });

  it('画面より幅が広いときは左端を優先して揃える', () => {
    expect(getTooltipShiftX(-20, 300, 250)).toBe(TOOLTIP_EDGE_MARGIN + 20);
  });
});
