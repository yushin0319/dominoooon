import { Maximize2 } from 'lucide-react';
import { memo, type ReactNode, useEffect, useId, useRef } from 'react';
import { parseTurnHeader } from '../domain/game';
import { useDialogKeyboard } from '../hooks/useDialogKeyboard';
import { cn } from '../lib/utils';

const TITLE = 'ゲームログ';

/**
 * ログの行を並べる。ターンの区切り（「--- ラウンド 2: あなたのターン ---」）は「---」を外して区切り線にする。
 * 新しい行（最後の 2 行）は目立たせる。large: 広げた画面用の大きい文字
 */
function LogEntries({
  log,
  large = false,
}: {
  log: string[];
  large?: boolean;
}) {
  const text = large ? 'text-sm' : 'text-xs';
  return (
    <div className="space-y-1">
      {log.map((entry, i) => {
        const key = `${i}-${entry.substring(0, 20)}`;
        const header = parseTurnHeader(entry);
        if (header) {
          return (
            <div
              key={key}
              data-log-header=""
              className={cn(
                'flex items-center gap-2 pt-1 font-bold text-sky-300',
                text,
              )}
            >
              <span aria-hidden="true" className="h-px flex-1 bg-slate-600" />
              <span className="shrink-0">{header}</span>
              <span aria-hidden="true" className="h-px flex-1 bg-slate-600" />
            </div>
          );
        }
        return (
          <div
            key={key}
            className={cn(
              'py-1 px-2 rounded',
              text,
              i >= log.length - 2
                ? 'bg-yellow-500/20 text-yellow-100'
                : 'text-slate-300',
            )}
          >
            {entry}
          </div>
        );
      })}
    </div>
  );
}

interface GameLogProps {
  log: string[];
  /** 見出しの右に置くもの（狭い画面の「山札・捨て札・勝利点」を開くボタン） */
  headerAction?: ReactNode;
  /** 狭い画面でログを広げて読む（あるときだけ見出しに「全部見る」を出す。PC では出さない） */
  onExpand?: () => void;
}

const GameLog = memo(function GameLog({
  log,
  headerAction,
  onExpand,
}: GameLogProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const entryCount = log.length;

  // 新しい行が増えたら、ログ欄だけを一番下までスクロールする。
  // scrollIntoView は使わない: はみ出しを隠している画面全体（overflow-hidden のルート）まで動かし、
  // PC で画面全体が上にずれて「キングダム」の見出しが切れていた
  useEffect(() => {
    const box = boxRef.current;
    if (box && entryCount > 0) box.scrollTop = box.scrollHeight;
  }, [entryCount]);

  return (
    // lg 未満: 手札の上に低めの高さで置く（手札のツールチップが上に出るよう z は手札より下） / lg 以上: 左下に浮かせる
    // （PC ではプレイエリアの幅を左右の欄に重ならないよう狭めてある: GamePage）
    <div
      ref={boxRef}
      data-game-log=""
      className="shrink-0 mx-2 mb-2 h-24 p-2 z-10 lg:absolute lg:mx-0 lg:mb-0 lg:bottom-3 lg:left-3 lg:z-30 lg:w-64 lg:h-48 lg:p-3 bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl overflow-y-auto scroll-smooth"
    >
      {/* 見出しはログ欄の上の余白（p-2 / lg:p-3）まで覆う。覆わないと、スクロールした行が見出しの上の余白に
          はみ出して見え、半透明の見出しの裏にも透けていた（AI のまとめの行が増えてスクロールしやすくなった） */}
      <div className="sticky -top-2 -mt-2 pt-3 lg:-top-3 lg:-mt-3 lg:pt-4 pb-1 mb-2 flex items-center justify-between gap-2 bg-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-xs font-bold text-white">{TITLE}</h3>
          {onExpand && (
            // 見出しの高さ（ログの見える行数）を変えないよう上下を詰め、押せる範囲は上下に広げて 44px にする
            // （山札・捨て札のボタンと同じ作り）
            <button
              type="button"
              onClick={onExpand}
              aria-label="ゲームログを全部見る"
              className="lg:hidden relative shrink-0 -my-0.5 inline-flex items-center gap-1 px-2 py-px rounded-md border border-slate-500 bg-slate-700/80 text-xs leading-4 font-bold text-slate-100 whitespace-nowrap hover:bg-slate-600 transition-colors before:absolute before:inset-x-0 before:-top-2.5 before:-bottom-4 before:content-['']"
            >
              <Maximize2 aria-hidden="true" className="w-3 h-3" />
              全部見る
            </button>
          )}
        </div>
        {headerAction}
      </div>
      <LogEntries log={log} />
    </div>
  );
});

export default GameLog;

interface GameLogDialogProps {
  log: string[];
  onClose: () => void;
}

/** 狭い画面用: ログを全部、大きく重ねて出す（外を押す・「閉じる」・Esc で閉じる）。開いたら一番新しい行を見せる */
export function GameLogDialog({ log, onClose }: GameLogDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(dialogRef, onClose);

  const entryCount = log.length;
  useEffect(() => {
    const list = listRef.current;
    if (list && entryCount > 0) list.scrollTop = list.scrollHeight;
  }, [entryCount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 外を押したら閉じる（読み上げ・Tab では「閉じる」ボタンを使う） */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/60 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md max-h-full flex flex-col p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
      >
        <h2 id={titleId} className="mb-3 text-base font-bold text-slate-100">
          {TITLE}
        </h2>
        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <LogEntries log={log} large />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 text-sm font-medium text-slate-200 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
