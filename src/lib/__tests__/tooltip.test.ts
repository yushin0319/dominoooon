import { describe, expect, it } from 'vitest';
import {
  getTooltipPosition,
  getTooltipShiftX,
  TOOLTIP_ARROW_INSET,
  TOOLTIP_EDGE_MARGIN,
  TOOLTIP_GAP,
} from '../tooltip';

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

describe('getTooltipPosition（画面に固定で置くツールチップの位置）', () => {
  const pc = { width: 1366, height: 900 };
  const sp = { width: 390, height: 844 };
  const size = { width: 256, height: 148 };

  it('上に余裕があれば、カードの上に中央をそろえて置く（PC の手札）', () => {
    const anchor = { left: 623, top: 700, right: 743, bottom: 870 };
    expect(getTooltipPosition(anchor, size, pc)).toEqual({
      left: 683 - 128,
      top: 700 - TOOLTIP_GAP - 148,
      placement: 'top',
      arrowLeft: 128,
    });
  });

  it('上に収まらないとき（サプライ 1 行目）は、カードの下に置く', () => {
    // 地下貯蔵庫: 上に置くと top=-130 になって切れていた
    const anchor = { left: 459, top: 26, right: 539, bottom: 138 };
    const pos = getTooltipPosition(anchor, size, pc);
    expect(pos.placement).toBe('bottom');
    expect(pos.top).toBe(138 + TOOLTIP_GAP);
    expect(pos.left).toBe(499 - 128);
  });

  it('上に置ける境界: 上端がちょうど余白の位置なら上に置く（境界値）', () => {
    const top = TOOLTIP_EDGE_MARGIN + 148 + TOOLTIP_GAP;
    const anchor = { left: 600, top, right: 680, bottom: top + 112 };
    expect(getTooltipPosition(anchor, size, pc).placement).toBe('top');
    const anchor2 = { ...anchor, top: top - 1, bottom: top + 111 };
    expect(getTooltipPosition(anchor2, size, pc).placement).toBe('bottom');
  });

  it('スマホで左端のカードなら右へずらし、矢印はカードの中心を指す', () => {
    const anchor = { left: 17, top: 300, right: 97, bottom: 412 };
    const pos = getTooltipPosition(anchor, size, sp);
    expect(pos.left).toBe(TOOLTIP_EDGE_MARGIN);
    expect(pos.arrowLeft).toBe(57 - TOOLTIP_EDGE_MARGIN);
  });

  it('スマホで右端のカードなら左へずらし、矢印はカードの中心を指す', () => {
    const anchor = { left: 293, top: 300, right: 373, bottom: 412 };
    const pos = getTooltipPosition(anchor, size, sp);
    expect(pos.left).toBe(390 - TOOLTIP_EDGE_MARGIN - 256);
    expect(pos.arrowLeft).toBe(333 - pos.left);
  });

  it('上にも下にも収まらないときは、広い方に置いて画面内に収める', () => {
    const anchor = { left: 100, top: 150, right: 180, bottom: 330 };
    const pos = getTooltipPosition(
      anchor,
      { width: 256, height: 200 },
      { width: 390, height: 400 },
    );
    expect(pos.placement).toBe('top');
    expect(pos.top).toBe(TOOLTIP_EDGE_MARGIN);
  });

  it('カードが画面の外にずれていても、矢印はツールチップの角より内側に収める', () => {
    const anchor = { left: -50, top: 300, right: 0, bottom: 412 };
    const pos = getTooltipPosition(anchor, size, sp);
    expect(pos.arrowLeft).toBe(TOOLTIP_ARROW_INSET);
  });
});
