import { type RefObject, useEffect, useRef } from 'react';
import { getTabbable } from '../lib/focus';

export interface DialogKeyboardOptions {
  /**
   * 開いたときにフォーカスを当てる所。
   * 'last'（既定）= 最後の押せるボタン（閉じる・確定）/ 'first' = 最初の押せる要素（選択画面のカード）/
   * 要素の ref = その要素（確認ダイアログの「やめる」「続ける」）
   */
  initialFocus?: 'first' | 'last' | RefObject<HTMLElement | null>;
  /** Esc で閉じるか（既定 true。閉じると効果が消える選択画面は false） */
  closeOnEscape?: boolean;
}

/** 開いたときにフォーカスする要素（押せないボタンは飛ばす） */
function pickInitial(
  dialog: HTMLElement,
  initialFocus: DialogKeyboardOptions['initialFocus'],
): HTMLElement | undefined {
  if (initialFocus && typeof initialFocus === 'object') {
    return initialFocus.current ?? undefined;
  }
  const tabbable = getTabbable(dialog);
  if (initialFocus === 'first') return tabbable[0];
  const buttons = tabbable.filter((el) => el.tagName === 'BUTTON');
  return buttons[buttons.length - 1] ?? tabbable[0];
}

/**
 * ダイアログのキーボード操作: 開いたらダイアログの中へフォーカス（既定は最後のボタン）、Esc で閉じる、
 * Tab はダイアログの中で回す（外にフォーカスがあれば中へ戻す）。閉じたら開く前にフォーカスがあった所へ戻す
 */
export function useDialogKeyboard(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: DialogKeyboardOptions = {},
) {
  // ref で最新の値を保持してエフェクトの再実行を防ぐ（開いている間に何度描き直しても、開いたときの処理は 1 回だけ）
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    if (dialog) pickInitial(dialog, optionsRef.current.initialFocus)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (optionsRef.current.closeOnEscape !== false) onCloseRef.current();
        return;
      }
      // フォーカストラップ: Tab キーをダイアログ内に閉じ込める
      const current = dialogRef.current;
      if (e.key !== 'Tab' || !current) return;
      const tabbable = getTabbable(current);
      const first = tabbable[0];
      const last = tabbable[tabbable.length - 1];
      if (!first || !last) {
        e.preventDefault();
        return;
      }
      const active = document.activeElement;
      if (!(active instanceof Node) || !current.contains(active)) {
        // 外（後ろの画面・body）にフォーカスがあるときは中へ戻す
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [dialogRef]); // マウント時に1回だけ登録
}
