import { memo, useEffect, useRef } from 'react';

interface GameLogProps {
  log: string[];
}

const GameLog = memo(function GameLog({ log }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    // lg 未満: 手札の上に低めの高さで置く（手札のツールチップが上に出るよう z は手札より下） / lg 以上: 左下に浮かせる
    <div className="shrink-0 mx-2 mb-2 h-24 p-2 z-10 lg:absolute lg:mx-0 lg:mb-0 lg:bottom-3 lg:left-3 lg:z-30 lg:w-64 lg:h-48 lg:p-3 bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl overflow-y-auto">
      <h3 className="text-xs font-bold text-white mb-2 sticky top-0 bg-slate-800/90 py-1">
        ゲームログ
      </h3>
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
        <div ref={endRef} />
      </div>
    </div>
  );
});

export default GameLog;
