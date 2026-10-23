/** 手札カード 1 枚の幅（CardView の通常サイズ w-[120px]） */
export const HAND_CARD_WIDTH = 120;

/** 隣のカードとの重なり幅の最小値（PC 幅での従来値） */
export const HAND_MIN_OVERLAP = 16;

/**
 * 手札の左右に確保する余白の合計。
 * Hand の p-2（左右 8px ずつ）と、扇形の回転で端のカードが外側へはみ出す分（片側 約 20px）を含む。
 */
export const HAND_SIDE_MARGIN = 64;

/** 重なりを増やしても、各カードの左端がこの幅だけは見えるようにする */
const MIN_VISIBLE_STRIP = 8;

/**
 * 手札を画面幅に収めるための、隣のカードとの重なり幅（px）を返す。
 * 収まる幅があるときは従来どおり HAND_MIN_OVERLAP。
 * スマホ幅など収まらないときは、全カードが画面内に入るまで重なりを増やす。
 */
export function getHandCardOverlap(
  cardCount: number,
  viewportWidth: number,
): number {
  if (cardCount < 2) return HAND_MIN_OVERLAP;
  const available = viewportWidth - HAND_SIDE_MARGIN;
  const needed = Math.ceil(
    (cardCount * HAND_CARD_WIDTH - available) / (cardCount - 1),
  );
  return Math.min(
    Math.max(HAND_MIN_OVERLAP, needed),
    HAND_CARD_WIDTH - MIN_VISIBLE_STRIP,
  );
}
