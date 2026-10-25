import { getCardArtUrl } from '../lib/cardArt';
import { cn } from '../lib/utils';
import type { CardDef } from '../types';

interface CardArtProps {
  def: CardDef;
  className?: string;
  /** 画面の外にあるうちは読み込まない（セットアップ画面のように一度に多く並ぶところ） */
  lazy?: boolean;
}

/**
 * カードの絵。入れ物の高さに収め、正方形のまま出す。
 * 名前は文字で出ているので飾りとして扱い（alt=""）、押してもドラッグの影が出ないようにする
 */
export default function CardArt({
  def,
  className,
  lazy = false,
}: CardArtProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <img
        src={getCardArtUrl(def)}
        alt=""
        loading={lazy ? 'lazy' : undefined}
        decoding="async"
        draggable={false}
        // 読み込めなかったとき（通信が切れた等）に、壊れた画像の印を出さない
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
        className="h-full max-w-full aspect-square object-contain rounded-md"
      />
    </div>
  );
}
