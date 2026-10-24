import { useRef } from 'react';
import { useDialogKeyboard } from '../hooks/useDialogKeyboard';

interface ConfirmDialogProps {
  title: string;
  /** 何が起きるか・何が残っているかの説明 */
  message: string;
  confirmLabel: string;
  /** やめる側のボタン（既定は「やめる」。確定が「やめる」のとき＝ゲームをやめる確認では「続ける」にする） */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 取り返しのつかない操作の前の確認（まだ使えるアクション・買えるコインが残っているのに、フェーズを進める / ターンを終えるとき）。
 * カードを使う・買うときの確認は出さない（毎回 2 タップになっていた。購入は直前の 1 回を取り消せる）
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'やめる',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // 開いたら確認ボタンへフォーカス、Esc でやめる、Tab はダイアログの中で回す
  useDialogKeyboard(dialogRef, onCancel);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-slate-100 mb-3">{title}</h2>
        <p className="text-sm text-slate-300 mb-6">{message}</p>
        {/* ボタンは押しやすい高さ（44px） */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
