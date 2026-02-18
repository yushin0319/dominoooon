import { memo, useEffect, useRef } from 'react';

interface GameLogProps {
  log: string[];
}

const GameLog = memo(function GameLog({ log }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="absolute bottom-3 left-3 z-30 w-64 h-48 p-3 bg-slate-800/70 backdrop-blur-sm rounded-lg border border-slate-600 shadow-xl overflow-y-auto">
      <h3 className="text-xs font-bold text-white mb-2 sticky top-0 bg-slate-800/90 py-1">
        ゲームログ
      </h3>
      <div className="space-y-1">
        {log.map((entry, i) => (
          <div
            key={`${i}-${entry.substring(0, 20)}`}
            className={`
              py-1 px-2 rounded text-xs
              ${i >= log.length - 2
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
