/** ツールチップと画面端の間に空ける余白（px） */
export const TOOLTIP_EDGE_MARGIN = 8;

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
