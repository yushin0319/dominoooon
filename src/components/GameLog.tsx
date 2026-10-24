import { memo, type ReactNode, useEffect, useRef } from 'react';

interface GameLogProps {
  log: string[];
  /** 見出しの右に置くもの（狭い画面の「山札・捨て札・勝利点」を開くボタン） */
  headerAction?: ReactNode;
}

const GameLog = memo(function GameLog({ log, headerAction }: GameLogProps) {
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
    <div
      ref={boxRef}
      data-game-log=""
      className="shrink-0 mx-2 mb-2 h-24 p-2 z-10 lg:absolute lg:mx-0 lg:mb-0 lg:bottom-3 lg:left-3 lg:z-30 lg:w-64 lg:h-48 lg:p-3 bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl overflow-y-auto scroll-smooth"
    >
      {/* 見出しはログ欄の上の余白（p-2 / lg:p-3）まで覆う。覆わないと、スクロールした行が見出しの上の余白に
          はみ出して見え、半透明の見出しの裏にも透けていた（AI のまとめの行が増えてスクロールしやすくなった） */}
      <div className="sticky -top-2 -mt-2 pt-3 lg:-top-3 lg:-mt-3 lg:pt-4 pb-1 mb-2 flex items-center justify-between gap-2 bg-slate-800">
        <h3 className="text-xs font-bold text-white">ゲームログ</h3>
        {headerAction}
      </div>
      <div className="space-y-1">
        {log.map((entry, i) => (
          <div
            key={`${i}-${entry.substring(0, 20)}`}
            className={`
              py-1 px-2 rounded text-xs
              ${
                i >= log.length - 2
                  ? 'bg-yellow-500/20 text-yellow-100'
                  : 'text-slate-300'
              }
            `}
          >
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
});

export default GameLog;
