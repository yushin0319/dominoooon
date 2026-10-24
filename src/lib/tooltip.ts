/** ツールチップと画面端の間に空ける余白（px） */
export const TOOLTIP_EDGE_MARGIN = 8;

/** カードとツールチップの間の隙間（px） */
export const TOOLTIP_GAP = 8;

/** 矢印をツールチップの角からこれ以上内側に置く（角の丸みに掛からないように）（px） */
export const TOOLTIP_ARROW_INSET = 12;

/**
 * ツールチップが画面の左右からはみ出さないための横方向のずらし量（px）を返す。
 * 正なら右へ、負なら左へずらす。収まっていれば 0。
 * スマホ幅で画面端のカードにツールチップ（幅 256px）を出すと切れるのを防ぐ。
 */
export function getTooltipShiftX(
  left: number,
  right: number,
  viewportWidth: number,
): number {
  if (left < TOOLTIP_EDGE_MARGIN) return TOOLTIP_EDGE_MARGIN - left;
  if (right > viewportWidth - TOOLTIP_EDGE_MARGIN) {
    return viewportWidth - TOOLTIP_EDGE_MARGIN - right;
  }
  return 0;
}

export interface TooltipAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TooltipPosition {
  /** 画面に固定で置く位置（position: fixed の left / top） */
  left: number;
  top: number;
  /** カードの上に置いたか下に置いたか（矢印の向き） */
  placement: 'top' | 'bottom';
  /** 矢印の位置（ツールチップの左端から、カードの中心まで） */
  arrowLeft: number;
}

/**
 * カード（anchor）に対するツールチップの位置を返す。
 * 基本はカードの上に中央をそろえて置き、上に収まらなければ（サプライ 1 行目など）下に置く。
 * 上下どちらにも収まらなければ広い方に置いて画面内に収める。左右ははみ出さないようずらす。
 */
export function getTooltipPosition(
  anchor: TooltipAnchor,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): TooltipPosition {
  const centerX = (anchor.left + anchor.right) / 2;
  const centeredLeft = centerX - size.width / 2;
  const left =
    centeredLeft +
    getTooltipShiftX(centeredLeft, centeredLeft + size.width, viewport.width);

  const topIfAbove = anchor.top - TOOLTIP_GAP - size.height;
  const topIfBelow = anchor.bottom + TOOLTIP_GAP;
  const fitsAbove = topIfAbove >= TOOLTIP_EDGE_MARGIN;
  const fitsBelow =
    topIfBelow + size.height <= viewport.height - TOOLTIP_EDGE_MARGIN;

  let placement: 'top' | 'bottom';
  if (fitsAbove) placement = 'top';
  else if (fitsBelow) placement = 'bottom';
  else {
    const roomAbove = anchor.top;
    const roomBelow = viewport.height - anchor.bottom;
    placement = roomAbove >= roomBelow ? 'top' : 'bottom';
  }
  const rawTop = placement === 'top' ? topIfAbove : topIfBelow;
  const maxTop = viewport.height - TOOLTIP_EDGE_MARGIN - size.height;
  const top = Math.max(TOOLTIP_EDGE_MARGIN, Math.min(rawTop, maxTop));

  const arrowLeft = Math.min(
    Math.max(centerX - left, TOOLTIP_ARROW_INSET),
    size.width - TOOLTIP_ARROW_INSET,
  );
  return { left, top, placement, arrowLeft };
}
