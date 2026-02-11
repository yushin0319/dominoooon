import type { SupplyPile } from '../types';
import CardView from './CardView';

interface SupplyAreaProps {
  supply: SupplyPile[];
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
}

const BASIC_NAMES = new Set(['Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse']);

export default function SupplyArea({ supply, onBuy, canBuy, maxCost }: SupplyAreaProps) {
  const basic = supply.filter((p) => BASIC_NAMES.has(p.card.name));
  const kingdom = supply.filter((p) => !BASIC_NAMES.has(p.card.name));

  function renderPile(pile: SupplyPile) {
    const affordable = canBuy && maxCost !== undefined && pile.card.cost <= maxCost && pile.count > 0;
    const empty = pile.count === 0;

    return (
      <div key={pile.card.name} className={`supply-pile${empty ? ' card-disabled' : ''}`}>
        <CardView
          card={pile.card}
          small
          onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
        />
        <span className="pile-count">×{pile.count}</span>
      </div>
    );
  }

  return (
    <div className="supply-area">
      <div className="supply-row supply-basic">{basic.map(renderPile)}</div>
      <div className="supply-row supply-kingdom">{kingdom.map(renderPile)}</div>
    </div>
  );
}
