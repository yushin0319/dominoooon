import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

/**
 * ダイアログのキーボード操作: 開いたら最後のボタン（確定・閉じる）にフォーカス、Esc で閉じる、
 * Tab はダイアログの中で回す。閉じたら開く前にフォーカスがあった所へ戻す
 */
export function useDialogKeyboard(
  dialogRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  // ref で最新の onClose を保持してエフェクトの再実行を防ぐ
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const buttons =
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[buttons.length - 1]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // フォーカストラップ: Tab キーをダイアログ内に閉じ込める
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [dialogRef]); // マウント時に1回だけ登録
}
