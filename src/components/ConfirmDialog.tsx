import { useId, useRef } from 'react';
import ModalShell from './ModalShell';

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
 * 取り返しのつかない操作の前の確認（まだ使えるアクション・買えるコインが残っているのに、フェーズを進める / ターンを終えるとき、
 * ゲームをやめるとき）。カードを使う・買うときの確認は出さない（毎回 2 タップになっていた。購入は直前の 1 回を取り消せる）。
 * 開いたときのフォーカスは安全な方（やめる・続ける）。確定に当てると、Enter を続けて押しただけで取り返しのつかない操作が進む
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'やめる',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const messageId = useId();

  return (
    <ModalShell
      title={title}
      titleClassName="text-xl font-bold text-slate-100 mb-3"
      onClose={onCancel}
      descriptionId={messageId}
      initialFocus={cancelRef}
      className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full shadow-xl"
    >
      <p id={messageId} className="text-sm text-slate-300 mb-6">
        {message}
      </p>
      {/* ボタンは押しやすい高さ（44px） */}
      <div className="flex gap-3 justify-end">
        <button
          ref={cancelRef}
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
    </ModalShell>
  );
}
