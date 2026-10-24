/** 長押しとみなすまでの時間（ms） */
export const LONG_PRESS_MS = 500;

/** 長押し中に指がこれより動いたら（スクロールしようとした等）長押しをやめる（px） */
export const LONG_PRESS_MOVE_TOLERANCE = 10;

/**
 * ホバーでツールチップを出してよい入力か。マウスだけを対象にする。
 * 指で触れたときもブラウザは互換のマウスイベント（mouseenter）を出すため、
 * mouseenter で出すと、タップした位置のツールチップが出たまま残っていた。
 */
export function isHoverPointer(pointerType: string): boolean {
  return pointerType === 'mouse';
}

/**
 * 指（タッチ・ペン）でタップしたときに、カードの説明を出すか。
 * - 押しても何も起きないカード（買えない・使えない・場のカードなど）: 出す
 * - 押すと確認画面が開くカード（使える手札・買えるカード）: 出さない（確認画面にカードの説明がある）
 * - 選択画面のカード（detailOnTap）: 選ぶのと一緒に出す（1 回目のタップで選んで説明、確定はボタン）
 * マウスでは出さない（PC はホバーで見られる）。入力の種類が分からない（null）ときも出さない。
 */
export function shouldShowDetailOnTap({
  pointerType,
  clickable,
  detailOnTap,
}: {
  pointerType: string | null;
  clickable: boolean;
  detailOnTap: boolean;
}): boolean {
  if (pointerType === null || isHoverPointer(pointerType)) return false;
  return !clickable || detailOnTap;
}

/** 長押しの途中で指が許容範囲を超えて動いたか */
export function isLongPressCancelled(
  start: { x: number; y: number },
  current: { x: number; y: number },
): boolean {
  return (
    Math.hypot(current.x - start.x, current.y - start.y) >
    LONG_PRESS_MOVE_TOLERANCE
  );
}
