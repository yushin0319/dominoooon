import { useSyncExternalStore } from 'react';

function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}

function getViewportWidth() {
  return window.innerWidth;
}

/** 画面の幅（resize で更新）。手札の並べ方や、選択画面のカードの大きさを決めるのに使う */
export function useViewportWidth(): number {
  return useSyncExternalStore(subscribeResize, getViewportWidth, () => 1024);
}
