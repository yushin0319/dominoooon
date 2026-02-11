import type { CardInstance } from '../types';
import CardView from './CardView';

interface PlayAreaProps {
  cards: CardInstance[];
}

export default function PlayArea({ cards }: PlayAreaProps) {
  return (
    <div className="play-area">
      {cards.map((card) => (
        <CardView key={card.instanceId} card={card} small />
      ))}
    </div>
  );
}
