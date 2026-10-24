import { memo } from 'react';
import { cn } from '../lib/utils';

interface TurnBarProps {
  /** 次に何をすればよいかの一言 */
  message: string;
  /** 相手が考え中（考え中の印を出す） */
  busy?: boolean;
  /** ターン・フェーズが変わったときのお知らせ（出ている間は一言の代わりに出す） */
  notice?: string | null;
  /** 主ボタン（購入へ進む / ターン終了） */
  primaryLabel?: string;
  onPrimary?: () => void;
  /** 取り消せる購入のカード名（あるときだけ「購入を取り消す」を出す） */
  undoCardName?: string;
  onUndo?: () => void;
}

/** 「」で囲んだ所（ボタン名）の途中では折り返さない（狭い画面で「購入へ進／む」と切れていた） */
function renderMessage(message: string) {
  let offset = 0;
  return message
    .split(/(「[^」]*」)/)
    .filter((part) => part !== '')
    .map((part) => {
      const key = offset;
      offset += part.length;
      return part.startsWith('「') ? (
        <span key={key} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        part
      );
    });
}

/**
 * 手札のすぐ上に常に見える帯。次に何をすればよいかの一言と、ターンを進めるボタンを置く。
 * サプライのスクロール領域の外に置くので、スクロールしなくても押せる（スマホでサプライの下に埋もれていた）。
 * お知らせもここに出す（画面上部に重ねて出すと、見出しやアクション・購入の数を隠していた）。
 */
const TurnBar = memo(function TurnBar({
  message,
  busy = false,
  notice = null,
  primaryLabel,
  onPrimary,
  undoCardName,
  onUndo,
}: TurnBarProps) {
  const showUndo = Boolean(onUndo && undoCardName);
  const showPrimary = Boolean(onPrimary && primaryLabel);
  const hasButtons = showUndo || showPrimary;
  return (
    // 高さは中身が変わっても同じにする（ボタンの有無・お知らせで手札の位置が動かないように）
    <div className="shrink-0 z-10 px-2 min-h-12 py-0.5 flex items-center justify-center">
      {/* 主ボタンは決まった幅の行の右端に置く（一言とお知らせの長さで横に動くと、押す位置がずれる） */}
      <div
        className={cn(
          'w-full max-w-2xl flex items-center gap-2 sm:gap-3',
          hasButtons ? 'justify-end' : 'justify-center',
        )}
      >
        <div
          aria-live="polite"
          className={cn(
            'min-w-0 flex items-center gap-2 text-xs sm:text-sm leading-tight',
            hasButtons
              ? 'flex-1 justify-end text-right'
              : 'justify-center text-center',
          )}
        >
          {notice ? (
            // 押しても邪魔にならないよう、クリックは下に通す
            <span
              key={notice}
              className="px-3 py-1 rounded-full bg-blue-600 text-white font-bold whitespace-nowrap shadow-lg pointer-events-none motion-safe:animate-fade-in"
            >
              {notice}
            </span>
          ) : (
            <>
              {busy && (
                <span
                  data-testid="turn-bar-spinner"
                  aria-hidden="true"
                  className="shrink-0 w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"
                />
              )}
              <p
                className={cn(
                  'font-medium',
                  busy ? 'text-slate-400' : 'text-emerald-200',
                )}
              >
                {renderMessage(message)}
              </p>
            </>
          )}
        </div>
        {showUndo && (
          <button
            type="button"
            onClick={onUndo}
            aria-label={`${undoCardName}の購入を取り消す`}
            className="shrink-0 min-h-11 px-3 text-sm font-medium text-slate-200 whitespace-nowrap bg-slate-700/90 border border-slate-500 rounded-lg hover:bg-slate-600 transition-colors"
          >
            購入を取り消す
          </button>
        )}
        {showPrimary && (
          <button
            type="button"
            onClick={onPrimary}
            className="shrink-0 min-h-11 px-5 text-sm font-bold text-white whitespace-nowrap bg-purple-600 rounded-lg shadow-lg hover:bg-purple-700 active:scale-95 transition"
          >
            {primaryLabel}
          </button>
        )}
      </div>
    </div>
  );
});

export default TurnBar;
