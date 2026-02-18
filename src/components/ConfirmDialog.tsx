import { useEffect, useRef } from 'react';
import type { CardDef } from '../types';
import CardView from './CardView';

interface ConfirmDialogProps {
  title: string;
  cardDef: CardDef;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  details?: { cost: number; types: string[] };
}

export default function ConfirmDialog({
  title,
  cardDef,
  confirmLabel,
  onConfirm,
  onCancel,
  details,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // ref で最新の onCancel を保持してエフェクトの再実行を防ぐ
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    // ダイアログ表示時に確認ボタンへフォーカス
    const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[buttons.length - 1]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancelRef.current();
        return;
      }
      // フォーカストラップ: Tab キーをダイアログ内に閉じ込める
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, [tabindex]:not([tabindex="-1"])',
          ),
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []); // マウント時に1回だけ登録

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
        <h2 className="text-2xl font-bold text-slate-100 mb-4">{title}</h2>
        <div className="flex justify-center mb-4">
          <CardView card={cardDef} />
        </div>
        {details && (
          <div className="space-y-1 mb-6">
            <p className="text-sm text-slate-300">コスト: {details.cost} コイン</p>
            <p className="text-sm text-slate-300">種別: {details.types.join(' / ')}</p>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
          >
            やめる
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
