import type { CardInstance } from '../types';
import CardView from './CardView';

interface HandProps {
  hand: CardInstance[];
  onPlay?: (instanceId: string) => void;
  canPlay?: boolean;
  selectedCards?: string[];
}

export default function Hand({ hand, onPlay, canPlay, selectedCards }: HandProps) {
  return (
    <div className="hand-area">
      {hand.map((card) => (
        <CardView
          key={card.instanceId}
          card={card}
          selected={selectedCards?.includes(card.instanceId)}
          onClick={canPlay && onPlay ? () => onPlay(card.instanceId) : undefined}
        />
      ))}
    </div>
  );
}
