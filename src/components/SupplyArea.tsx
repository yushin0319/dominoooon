import { memo, type ReactNode, useMemo } from 'react';
import { BASIC_SUPPLY, isKingdomPile } from '../domain/supply';
import { getSupplyPileStatus } from '../lib/cardStatus';
import { CardType, type SupplyPile } from '../types';
import CardView from './CardView';

interface SupplyAreaProps {
  supply: SupplyPile[];
  onBuy?: (cardName: string) => void;
  canBuy?: boolean;
  maxCost?: number;
  /** 「キングダム」の見出しの右に置くもの（スマホのゲーム中の「?」とメニュー） */
  headerAction?: ReactNode;
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
  const empty = pile.count === 0;
  // 売り切れはいつも暗く、購入フェーズでは買えるカードを光らせ、買えないカードを暗くする
  const status = empty
    ? 'unavailable'
    : getSupplyPileStatus(pile, Boolean(canBuy), maxCost);
  // 押すとすぐ買う（買えるときだけ。買い間違いは直前の 1 回を取り消せる）
  const buy =
    status === 'available' && onBuy ? () => onBuy(pile.card.name) : undefined;
  // 買えない理由（コイン不足）は画面には出さず、読み上げ用にだけ残す（バッジがコストの数字を隠していたため）
  const shortage =
    canBuy && maxCost !== undefined && !empty && pile.card.cost > maxCost
      ? pile.card.cost - maxCost
      : 0;

  const handleKeyDown = buy
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          buy();
        }
      }
    : undefined;

  return (
    // クリックは CardView の onClick で受ける（ここでも受けると 1 回のクリックで 2 回呼ばれる）。キーボード操作はここで受ける
    <div
      className="relative"
      role={buy ? 'button' : undefined}
      tabIndex={buy ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <CardView
        card={pile.card}
        small
        status={status}
        onClick={buy}
        remaining={pile.count}
      />
      {shortage > 0 && (
        <span className="sr-only">コイン不足（あと{shortage}）</span>
      )}
      {/* 売り切れ: カードの中央に出す（左下のコストの丸に重ねない）。暗いカードの上でも目立つ色にする
          （灰色だと暗くしたカードに溶けて、空の山に気づきにくかった。空の山が 3 つでゲーム終了） */}
      {empty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white bg-rose-600 ring-1 ring-white/60 shadow-md whitespace-nowrap">
            売り切れ
          </span>
        </div>
      )}
    </div>
  );
});

const SupplyArea = memo(function SupplyArea({
  supply,
  onBuy,
  canBuy,
  maxCost,
  headerAction,
}: SupplyAreaProps) {
  // 基本カード vs 王国カードで分類（Gardens等のVictory王国カードを正しく分類）
  const treasure = useMemo(
    () =>
      supply.filter(
        (p) =>
          p.card.types.includes(CardType.Treasure) &&
          BASIC_SUPPLY.has(p.card.name),
      ),
    [supply],
  );
  const victory = useMemo(
    () =>
      supply.filter(
        (p) =>
          p.card.types.includes(CardType.Victory) &&
          BASIC_SUPPLY.has(p.card.name),
      ),
    [supply],
  );
  const curse = useMemo(
    () => supply.filter((p) => p.card.types.includes(CardType.Curse)),
    [supply],
  );
  const kingdom = useMemo(() => supply.filter(isKingdomPile), [supply]);

  return (
    <div className="flex flex-col gap-5">
      {/* キングダムカード（PC では 5 枚 × 2 行、狭い画面では折り返す） */}
      <div className="flex flex-col items-center gap-3">
        {headerAction ? (
          // 見出しは真ん中のまま、右端に置く。置くものが lg 以上で隠れるときは高さも元に戻す（PC は縦の余りが無い）
          <div className="relative w-full flex items-center justify-center min-h-11 lg:min-h-0">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">
              キングダム
            </h3>
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              {headerAction}
            </div>
          </div>
        ) : (
          <h3 className="text-sm font-semibold text-slate-300 mb-1">
            キングダム
          </h3>
        )}

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
        <h3 className="text-sm font-semibold text-slate-300 mb-1">
          基本カード
        </h3>

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
          <div className="hidden lg:block w-px h-16 bg-gray-600" />

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
              <div className="hidden lg:block w-px h-16 bg-gray-600" />
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
