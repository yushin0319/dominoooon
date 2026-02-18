import { memo, useMemo } from 'react';
import { CardType, type SupplyPile } from '../types';
import CardView from './CardView';

interface SupplyAreaProps {
  supply: SupplyPile[];
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
}

interface SupplyPileItemProps {
  pile: SupplyPile;
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
}

const SupplyPileItem = memo(function SupplyPileItem({ pile, onBuy, canBuy, maxCost }: SupplyPileItemProps) {
  const affordable = canBuy && maxCost !== undefined && pile.card.cost <= maxCost && pile.count > 0;
  const empty = pile.count === 0;
  const coinShortage = canBuy && maxCost !== undefined && pile.card.cost > maxCost && pile.count > 0;

  // バッジテキストと色を決定
  let badgeText = '';
  let badgeColor = '';
  if (empty) {
    badgeText = '売り切れ';
    badgeColor = 'bg-gray-500';
  } else if (coinShortage) {
    const shortage = pile.card.cost - maxCost!;
    badgeText = `コイン不足 (-${shortage})`;
    badgeColor = 'bg-orange-500';
  }

  const handleKeyDown = affordable && onBuy
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBuy(pile.card.name);
        }
      }
    : undefined;

  return (
    <div
      className={`
        relative
        transition-all duration-200
        ${empty ? 'opacity-35 pointer-events-none' : 'opacity-100'}
      `}
      role={affordable && onBuy ? 'button' : undefined}
      tabIndex={affordable && onBuy ? 0 : undefined}
      onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
      onKeyDown={handleKeyDown}
    >
      <CardView
        card={pile.card}
        small
        onClick={affordable && onBuy ? () => onBuy(pile.card.name) : undefined}
        remaining={pile.count}
      />
      {/* 購入不可理由バッジ */}
      {badgeText && (
        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2
            px-2 py-0.5 rounded-full text-[11px] font-bold text-white
            shadow-md whitespace-nowrap
            ${badgeColor}
          `}
        >
          {badgeText}
        </div>
      )}
    </div>
  );
});

const SupplyArea = memo(function SupplyArea({ supply, onBuy, canBuy, maxCost }: SupplyAreaProps) {
  // CardType ベースで分類（useMemo で毎レンダリングの再計算を防止）
  const treasure = useMemo(() => supply.filter((p) => p.card.types.includes(CardType.Treasure)), [supply]);
  const victory = useMemo(() => supply.filter((p) => p.card.types.includes(CardType.Victory)), [supply]);
  const curse = useMemo(() => supply.filter((p) => p.card.types.includes(CardType.Curse)), [supply]);
  const kingdom = useMemo(() => supply.filter(
    (p) =>
      !p.card.types.includes(CardType.Treasure) &&
      !p.card.types.includes(CardType.Victory) &&
      !p.card.types.includes(CardType.Curse),
  ), [supply]);

  // キングダムカードを2行に分割
  const kingdomRow1 = kingdom.slice(0, 5);
  const kingdomRow2 = kingdom.slice(5, 10);

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* キングダムカード（2行配置） */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">キングダム</h3>

        {/* Row 1 */}
        <div className="flex items-center gap-3">
          {kingdomRow1.map((pile) => (
            <SupplyPileItem key={pile.card.name} pile={pile} onBuy={onBuy} canBuy={canBuy} maxCost={maxCost} />
          ))}
        </div>

        {/* Row 2 */}
        {kingdomRow2.length > 0 && (
          <div className="flex items-center gap-3">
            {kingdomRow2.map((pile) => (
              <SupplyPileItem key={pile.card.name} pile={pile} onBuy={onBuy} canBuy={canBuy} maxCost={maxCost} />
            ))}
          </div>
        )}
      </div>

      {/* 基本カード（財宝 + 勝利点） */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">基本カード</h3>

        <div className="flex items-center gap-6">
          {/* 財宝カード */}
          <div className="flex items-center gap-3">
            {treasure.map((pile) => (
              <SupplyPileItem key={pile.card.name} pile={pile} onBuy={onBuy} canBuy={canBuy} maxCost={maxCost} />
            ))}
          </div>

          {/* 区切り線（ダークテーマ対応） */}
          <div className="w-px h-16 bg-gray-300 dark:bg-gray-600" />

          {/* 勝利点カード */}
          <div className="flex items-center gap-3">
            {victory.map((pile) => (
              <SupplyPileItem key={pile.card.name} pile={pile} onBuy={onBuy} canBuy={canBuy} maxCost={maxCost} />
            ))}
          </div>

          {/* 呪いカード（存在する場合） */}
          {curse.length > 0 && (
            <>
              <div className="w-px h-16 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-3">
                {curse.map((pile) => (
                  <SupplyPileItem key={pile.card.name} pile={pile} onBuy={onBuy} canBuy={canBuy} maxCost={maxCost} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default SupplyArea;
