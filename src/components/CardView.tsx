import type { CardInstance, CardDef, CardType } from '../types';

interface CardViewProps {
  card: CardInstance | CardDef;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
}

function getDef(card: CardInstance | CardDef): CardDef {
  return 'def' in card ? card.def : card;
}

function typeClass(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'card-attack';
  if (types.includes('Reaction' as CardType)) return 'card-reaction';
  if (types.includes('Treasure' as CardType)) return 'card-treasure';
  if (types.includes('Victory' as CardType)) return 'card-victory';
  if (types.includes('Curse' as CardType)) return 'card-curse';
  return 'card-action';
}

function effectText(def: CardDef): string {
  const parts: string[] = [];
  const e = def.effects;
  if (e.cards) parts.push(`+${e.cards} Card${e.cards > 1 ? 's' : ''}`);
  if (e.actions) parts.push(`+${e.actions} Action${e.actions > 1 ? 's' : ''}`);
  if (e.buys) parts.push(`+${e.buys} Buy${e.buys > 1 ? 's' : ''}`);
  if (e.coins) parts.push(`+${e.coins} Coin${e.coins > 1 ? 's' : ''}`);
  if (def.vpValue !== undefined) parts.push(`${def.vpValue} VP`);
  return parts.join(', ');
}

export default function CardView({ card, onClick, selected, small }: CardViewProps) {
  const def = getDef(card);
  const cls = [
    'card',
    typeClass(def.types),
    selected ? 'card-selected' : '',
    small ? 'card-small' : '',
    onClick ? 'card-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} onClick={onClick}>
      <div className="card-header">
        <span className="card-name">{def.name}</span>
        <span className="card-cost">{def.cost}</span>
      </div>
      {!small && (
        <>
          <div className="card-types">{def.types.join(' / ')}</div>
          <div className="card-effects">{effectText(def)}</div>
        </>
      )}
    </div>
  );
}
