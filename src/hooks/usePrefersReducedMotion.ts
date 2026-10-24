import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** matchMedia が無い環境（テストの jsdom など）では「減らさない」扱い */
function getMediaQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY)
    : null;
}

function subscribe(onChange: () => void) {
  const mq = getMediaQuery();
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false;
}

/** OS の「視差効果を減らす / アニメーションを減らす」設定（prefers-reduced-motion: reduce） */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
