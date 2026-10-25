/** Tab で止まりうる要素（押せないもの・tabindex=-1 はあとで除く） */
const CANDIDATES =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** 見えているか（display: none の中・visibility: hidden は Tab で止まらない）。レイアウトしない jsdom では常に true */
function isVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility !== 'function') return true;
  return el.checkVisibility({ visibilityProperty: true });
}

/** Tab で止まる要素か（押せないボタン・tabindex=-1・隠れているものは止まらない） */
export function isTabbable(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (!el.matches(CANDIDATES)) return false;
  if (el.matches(':disabled')) return false;
  if (el.getAttribute('tabindex') === '-1') return false;
  return isVisible(el);
}

/** container の中で Tab で止まる要素を、Tab の順（文書の順）に返す */
export function getTabbable(container: ParentNode): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(CANDIDATES)].filter(
    isTabbable,
  );
}
