import { CircleHelp, LogOut, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import ModalShell from './ModalShell';

interface GameMenuButtonsProps {
  onHelp: () => void;
  onMenu: () => void;
  /**
   * 名前も出す（PC の左上。幅 1280px 以上のときだけ。1024〜1279px は名前を出すと「キングダム」の見出しに重なる）。
   * 出さないときは印だけ（スマホ: キングダムの見出しの横で幅が無い）
   */
  showLabels?: boolean;
  className?: string;
}

const BUTTON =
  'min-h-11 min-w-11 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/80 text-sm font-medium text-slate-100 shadow hover:bg-slate-700 transition-colors';

/** ゲーム中の「?」（遊び方）と「メニュー」（やめる など）。押せる大きさは 44px */
export function GameMenuButtons({
  onHelp,
  onMenu,
  showLabels = false,
  className,
}: GameMenuButtonsProps) {
  const buttons = [
    { label: '遊び方', Icon: CircleHelp, onClick: onHelp },
    { label: 'メニュー', Icon: Menu, onClick: onMenu },
  ];
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {buttons.map(({ label, Icon, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(BUTTON, showLabels && 'xl:px-3')}
        >
          <Icon aria-hidden="true" className="w-5 h-5" />
          {showLabels && (
            <span aria-hidden="true" className="hidden xl:inline">
              {label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface GameMenuDialogProps {
  onHelp: () => void;
  onQuit: () => void;
  onClose: () => void;
}

const MENU_ITEM =
  'w-full min-h-12 px-4 inline-flex items-center gap-3 rounded-lg border text-left text-base font-medium transition-colors';

/**
 * ゲーム中のメニュー: 遊び方を見る / ゲームをやめる（確認はこの外の ConfirmDialog）。
 * 途中のゲームは自動で保存していることもここで知らせる（閉じても続きから遊べる）
 */
export function GameMenuDialog({
  onHelp,
  onQuit,
  onClose,
}: GameMenuDialogProps) {
  return (
    <ModalShell
      title="メニュー"
      titleClassName="mb-4 text-lg font-bold text-white"
      onClose={onClose}
      className="w-full max-w-sm p-5 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={onHelp}
          className={cn(
            MENU_ITEM,
            'border-slate-600 bg-slate-700/70 text-slate-100 hover:bg-slate-600',
          )}
        >
          <CircleHelp aria-hidden="true" className="w-5 h-5 shrink-0" />
          遊び方を見る
        </button>
        <button
          type="button"
          onClick={onQuit}
          className={cn(
            MENU_ITEM,
            'border-rose-500/60 bg-rose-900/30 text-rose-100 hover:bg-rose-900/50',
          )}
        >
          <LogOut aria-hidden="true" className="w-5 h-5 shrink-0" />
          ゲームをやめる
        </button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        途中のゲームは自動で保存しています。ページを閉じても、次に開いたときに続きから遊べます。
      </p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-5 text-sm font-medium text-slate-200 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
        >
          閉じる
        </button>
      </div>
    </ModalShell>
  );
}
