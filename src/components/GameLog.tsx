import { useEffect, useRef } from 'react';

interface GameLogProps {
  log: string[];
}

export default function GameLog({ log }: GameLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="game-log">
      {log.map((entry, i) => (
        <div key={i} className="log-entry">
          {entry}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
