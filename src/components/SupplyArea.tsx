import type { SupplyPile } from '../types';
import CardView from './CardView';

interface SupplyAreaProps {
  supply: SupplyPile[];
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
}

const BASIC_NAMES = new Set(['Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse']);
const TREASURE_NAMES = new Set(['Copper', 'Silver', 'Gold']);
const VICTORY_NAMES = new Set(['Estate', 'Duchy', 'Province']);

export default function SupplyArea({ supply, onBuy, canBuy, maxCost }: SupplyAreaProps) {
  const kingdom = supply.filter((p) => !BASIC_NAMES.has(p.card.name));
  const treasure = supply.filter((p) => TREASURE_NAMES.has(p.card.name));
  const victory = supply.filter((p) => VICTORY_NAMES.has(p.card.name));
  const curse = supply.filter((p) => p.card.name === 'Curse');

  // キングダムカードを2行に分割
  const kingdomRow1 = kingdom.slice(0, 5);
  const kingdomRow2 = kingdom.slice(5, 10);

  function renderPile(pile: SupplyPile) {
    const affordable = canBuy && maxCost !== undefined && pile.card.cost <= maxCost && pile.count > 0;
    const empty = pile.count === 0;

    return (
      <div
        key={pile.card.name}
        className={`
          transition-all duration-200
          ${empty ? 'opacity-35 pointer-events-none' : 'opacity-100'}
        `}
        onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
      >
        <CardView
          card={pile.card}
          small
          onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
          remaining={pile.count}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* キングダムカード（2行配置） */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">キングダム</h3>

        {/* Row 1 */}
        <div className="flex items-center gap-3">
          {kingdomRow1.map(renderPile)}
        </div>

        {/* Row 2 */}
        {kingdomRow2.length > 0 && (
          <div className="flex items-center gap-3">
            {kingdomRow2.map(renderPile)}
          </div>
        )}
      </div>

      {/* 基本カード（財宝 + 勝利点） */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">基本カード</h3>

        <div className="flex items-center gap-6">
          {/* 財宝カード */}
          <div className="flex items-center gap-3">
            {treasure.map(renderPile)}
          </div>

          {/* 区切り線 */}
          <div className="w-px h-16 bg-gray-300" />

          {/* 勝利点カード */}
          <div className="flex items-center gap-3">
            {victory.map(renderPile)}
          </div>

          {/* 呪いカード（存在する場合） */}
          {curse.length > 0 && (
            <>
              <div className="w-px h-16 bg-gray-300" />
              <div className="flex items-center gap-3">
                {curse.map(renderPile)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
