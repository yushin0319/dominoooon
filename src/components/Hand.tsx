import { motion } from 'framer-motion';
import { memo, useCallback, useMemo } from 'react';
import { useViewportWidth } from '../hooks/useViewportWidth';
import {
  type CardStatus,
  getHandCardStatus,
  hasPlayableCard,
} from '../lib/cardStatus';
import {
  getHandLayout,
  type HandCardPose,
  HOVER_LIFT,
} from '../lib/handLayout';
import { cn } from '../lib/utils';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface HandProps {
  hand: CardInstance[];
  onPlay?: (instanceId: string) => void;
  canPlay?: boolean;
  selectedCards?: string[];
}

interface HandCardProps {
  card: CardInstance;
  index: number;
  overlap: number;
  pose: HandCardPose;
  /** ホバーしたカードを一番手前に出すか（重なりが大きい一列のときは出さない） */
  raiseOnHover: boolean;
  status?: CardStatus;
  onPlay?: (instanceId: string) => void;
  isSelected: boolean;
}

const HandCard = memo(function HandCard({
  card,
  index,
  overlap,
  pose,
  raiseOnHover,
  status,
  onPlay,
  isSelected,
}: HandCardProps) {
  // 押せるのは今プレイできるカード（アクションフェーズのアクションカード）だけ
  const playable = status === 'available' && onPlay !== undefined;

  const handleClick = useCallback(() => {
    if (playable && onPlay) {
      onPlay(card.instanceId);
    }
  }, [playable, onPlay, card.instanceId]);

  return (
    <motion.div
      data-hand-card=""
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: isSelected ? pose.y - 30 : pose.y,
        opacity: 1,
        rotate: pose.rotate,
        scale: isSelected ? 1.05 : 1,
      }}
      whileHover={
        playable
          ? {
              y: pose.y - HOVER_LIFT,
              ...(raiseOnHover ? { zIndex: 50 } : {}),
            }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        marginLeft: index === 0 ? 0 : -overlap,
        zIndex: isSelected ? 100 : index,
      }}
      className={cn('shrink-0', playable ? 'cursor-pointer' : 'cursor-default')}
    >
      <CardView
        card={card}
        selected={isSelected}
        status={status}
        onClick={playable ? handleClick : undefined}
      />
    </motion.div>
  );
});

const Hand = memo(function Hand({
  hand,
  onPlay,
  canPlay,
  selectedCards,
}: HandProps) {
  // PC 幅は従来どおりの扇形、狭い画面・枚数が多いときは傾けずに一列（収まらなければ横スクロール）
  const viewportWidth = useViewportWidth();
  const layout = useMemo(
    () => getHandLayout(hand.length, viewportWidth),
    [hand.length, viewportWidth],
  );
  const canPlayActions = Boolean(canPlay) && onPlay !== undefined;
  const showHint = hasPlayableCard(hand, canPlayActions);

  return (
    <div className="relative flex flex-col items-center px-2 pt-1 pb-2 lg:pt-2 lg:pb-0 rounded-xl bg-white/5">
      {/* 案内文（プレイできるカードがあるときだけ）。lg 未満は手札の上の 1 行（出ていなくても高さをとって、
          出し入れで画面が動かないようにする）、lg 以上は手札の欄のすぐ上に浮かせる（縦の幅をとらない） */}
      <div
        aria-live="polite"
        className="h-5 lg:h-0 w-full flex items-center justify-center"
      >
        {showHint && (
          <p className="text-xs font-medium text-emerald-200 whitespace-nowrap pointer-events-none lg:absolute lg:bottom-full lg:left-1/2 lg:-translate-x-1/2 lg:mb-1 lg:px-3 lg:py-0.5 lg:rounded-full lg:bg-slate-900/95">
            光っているカードを押してプレイ
          </p>
        )}
      </div>
      {/* 一列のときは横スクロールできる欄に入れる（扇形は傾いた端が欄の外にはみ出すので切らない） */}
      <div
        className={cn(
          'w-full',
          layout.mode === 'row' && 'overflow-x-auto overflow-y-hidden',
        )}
      >
        {/* 列の高さは傾き・持ち上げ分を含む（扇形の端のカードのコストの丸が欄の下で切れないように） */}
        <div
          className={cn(
            'flex w-max mx-auto',
            layout.mode === 'row' ? 'items-end px-1' : 'items-start',
          )}
          style={{ height: layout.rowHeight }}
        >
          {hand.map((card, index) => (
            <HandCard
              key={card.instanceId}
              card={card}
              index={index}
              overlap={layout.overlap}
              pose={layout.poses[index]}
              raiseOnHover={layout.raiseOnHover}
              status={getHandCardStatus(card, canPlayActions)}
              onPlay={onPlay}
              isSelected={selectedCards?.includes(card.instanceId) ?? false}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export default Hand;
