import { useEffect, useRef } from 'react';
import { isTabbable } from '../lib/focus';
import { isKeyboardModality, isTabbedOut } from '../lib/inputModality';

/** フォーカスが行き場をなくしたか（body に落ちた・押した要素が消えた・押せなくなった） */
function isFocusLost(): boolean {
  const active = document.activeElement;
  if (!active || active === document.body) return true;
  return !isTabbable(active);
}

/**
 * キーボードで遊んでいるときに、フォーカスが行き場をなくしたら（使ったカードが手札から消えた・買えなくなった・
 * ボタンが消えた・自分の番になった）、getTarget が返す「次に押す所」へ移す。
 * 最後の操作がマウス・指なら何もしない（見た目と操作感を変えない）。ダイアログが開いている間はダイアログに任せる。
 * Tab で最後の要素から画面の外へ出たときも何もしない（引き戻すと Tab で一周できなくなる）。
 * 描き直しのたびと、フォーカスが外れたときに確かめる（React が描き終えてから: setTimeout で後回し）
 */
export function useFocusFallback(getTarget: () => HTMLElement | null) {
  const getTargetRef = useRef(getTarget);
  getTargetRef.current = getTarget;
  const timerRef = useRef<number | undefined>(undefined);
  const scheduleRef = useRef(() => {});

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (!isKeyboardModality() || isTabbedOut() || !isFocusLost()) return;
        if (document.querySelector('[role="dialog"]')) return;
        getTargetRef.current()?.focus();
      }, 0);
    };
    scheduleRef.current = schedule;
    document.addEventListener('focusout', schedule);
    return () => {
      document.removeEventListener('focusout', schedule);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  // 描き直しのたび（手札・フェーズ・番が変わったとき）に確かめる
  useEffect(() => {
    scheduleRef.current();
  });
}
