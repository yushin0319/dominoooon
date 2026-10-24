import { type ReactNode, useId, useRef } from 'react';
import { useDialogKeyboard } from '../hooks/useDialogKeyboard';
import { cn } from '../lib/utils';

interface ModalShellProps {
  /** 見出し（ダイアログの名前にもなる） */
  title: string;
  titleClassName?: string;
  onClose: () => void;
  /** 外側の暗い幕の色 */
  backdropClassName?: string;
  /** ダイアログの枠 */
  className?: string;
  children: ReactNode;
}

/**
 * 重ねて出すダイアログの共通の枠: 暗い幕（押すと閉じる）、role="dialog" と見出し、
 * キーボード（開いたら最後のボタンへ・Esc で閉じる・Tab は中で回す。useDialogKeyboard）。
 * 遊び方・ゲーム中のメニューで使う
 */
export default function ModalShell({
  title,
  titleClassName,
  onClose,
  backdropClassName = 'bg-black/60',
  className,
  children,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 外を押したら閉じる（読み上げ・Tab では「閉じる」ボタンを使う） */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          'absolute inset-0 w-full h-full cursor-default',
          backdropClassName,
        )}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('relative', className)}
      >
        <h2 id={titleId} className={titleClassName}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
