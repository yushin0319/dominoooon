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

const SupplyPileItem = memo(function SupplyPileItem({
  pile,
  onBuy,
  canBuy,
  maxCost,
}: SupplyPileItemProps) {
  const affordable =
    canBuy &&
    maxCost !== undefined &&
    pile.card.cost <= maxCost &&
    pile.count > 0;
  const empty = pile.count === 0;
  const coinShortage =
    canBuy &&
    maxCost !== undefined &&
    pile.card.cost > maxCost &&
    pile.count > 0;

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

  const handleKeyDown =
    affordable && onBuy
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

// 基本サプライカード名（王国カードと区別するため）
const BASIC_CARDS = new Set([
  'Copper',
  'Silver',
  'Gold',
  'Estate',
  'Duchy',
  'Province',
  'Curse',
]);

const SupplyArea = memo(function SupplyArea({
  supply,
  onBuy,
  canBuy,
  maxCost,
}: SupplyAreaProps) {
  // 基本カード vs 王国カードで分類（Gardens等のVictory王国カードを正しく分類）
  const treasure = useMemo(
    () =>
      supply.filter(
        (p) =>
          p.card.types.includes(CardType.Treasure) &&
          BASIC_CARDS.has(p.card.name),
      ),
    [supply],
  );
  const victory = useMemo(
    () =>
      supply.filter(
        (p) =>
          p.card.types.includes(CardType.Victory) &&
          BASIC_CARDS.has(p.card.name),
      ),
    [supply],
  );
  const curse = useMemo(
    () => supply.filter((p) => p.card.types.includes(CardType.Curse)),
    [supply],
  );
  const kingdom = useMemo(
    () => supply.filter((p) => !BASIC_CARDS.has(p.card.name)),
    [supply],
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* キングダムカード（PC では 5 枚 × 2 行、狭い画面では折り返す） */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">キングダム</h3>

        {/* 最大幅 448px = カード幅 80px（w-20）× 5 + 間隔 12px（gap-3）× 4 で 1 行 5 枚に揃える */}
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-[448px]">
          {kingdom.map((pile) => (
            <SupplyPileItem
              key={pile.card.name}
              pile={pile}
              onBuy={onBuy}
              canBuy={canBuy}
              maxCost={maxCost}
            />
          ))}
        </div>
      </div>

      {/* 基本カード（財宝 + 勝利点）。狭い画面では種類ごとに折り返す */}
      <div className="flex flex-col items-center gap-3">
        <h3 className="text-sm font-semibold opacity-70 mb-1">基本カード</h3>

        <div className="flex flex-wrap items-center justify-center gap-3 lg:gap-6">
          {/* 財宝カード */}
          <div className="flex items-center gap-3">
            {treasure.map((pile) => (
              <SupplyPileItem
                key={pile.card.name}
                pile={pile}
                onBuy={onBuy}
                canBuy={canBuy}
                maxCost={maxCost}
              />
            ))}
          </div>

          {/* 区切り線（ダークテーマ対応）。折り返す幅では行末に残るので出さない */}
          <div className="hidden lg:block w-px h-16 bg-gray-300 dark:bg-gray-600" />

          {/* 勝利点カード */}
          <div className="flex items-center gap-3">
            {victory.map((pile) => (
              <SupplyPileItem
                key={pile.card.name}
                pile={pile}
                onBuy={onBuy}
                canBuy={canBuy}
                maxCost={maxCost}
              />
            ))}
          </div>

          {/* 呪いカード（存在する場合） */}
          {curse.length > 0 && (
            <>
              <div className="hidden lg:block w-px h-16 bg-gray-300 dark:bg-gray-600" />
              <div className="flex items-center gap-3">
                {curse.map((pile) => (
                  <SupplyPileItem
                    key={pile.card.name}
                    pile={pile}
                    onBuy={onBuy}
                    canBuy={canBuy}
                    maxCost={maxCost}
                  />
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
