import { motion } from 'framer-motion';
import { memo, useCallback, useSyncExternalStore } from 'react';
import { getHandCardOverlap } from '../lib/handLayout';
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
  totalCards: number;
  overlap: number;
  onPlay?: (instanceId: string) => void;
  canPlay?: boolean;
  isSelected: boolean;
}

const FAN_ANGLE = 5;

// 画面幅（resize で更新）。手札の重なり幅の計算に使う
function subscribeResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}
function getViewportWidth() {
  return window.innerWidth;
}

const HandCard = memo(function HandCard({
  card,
  index,
  totalCards,
  overlap,
  onPlay,
  canPlay,
  isSelected,
}: HandCardProps) {
  const centerIdx = (totalCards - 1) / 2;
  const rotation = (index - centerIdx) * FAN_ANGLE;
  const yOffset = Math.abs(index - centerIdx) * 6;

  const handleClick = useCallback(() => {
    if (canPlay && onPlay) {
      onPlay(card.instanceId);
    }
  }, [canPlay, onPlay, card.instanceId]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{
        y: isSelected ? yOffset - 30 : yOffset,
        opacity: 1,
        rotate: rotation,
        scale: isSelected ? 1.05 : 1,
      }}
      whileHover={
        canPlay && onPlay ? { y: yOffset - 5, zIndex: 50 } : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        marginLeft: index === 0 ? 0 : -overlap,
        zIndex: isSelected ? 100 : index,
      }}
      className={canPlay && onPlay ? 'cursor-pointer' : 'cursor-default'}
    >
      <CardView
        card={card}
        selected={isSelected}
        onClick={canPlay && onPlay ? handleClick : undefined}
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
  // スマホ幅でも全カードが画面内に収まるよう、重なり幅を画面幅から決める（PC 幅では従来の 16px）
  const viewportWidth = useSyncExternalStore(subscribeResize, getViewportWidth);
  const overlap = getHandCardOverlap(hand.length, viewportWidth);

  return (
    <div className="relative flex flex-col items-center justify-start p-2 rounded-xl bg-white/5 min-h-[200px]">
      {canPlay && onPlay && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium">
          カードをクリックしてプレイ
        </div>
      )}
      <div className="flex items-end justify-center">
        {hand.map((card, index) => (
          <HandCard
            key={card.instanceId}
            card={card}
            index={index}
            totalCards={hand.length}
            overlap={overlap}
            onPlay={onPlay}
            canPlay={canPlay}
            isSelected={selectedCards?.includes(card.instanceId) ?? false}
          />
        ))}
      </div>
    </div>
  );
});

export default Hand;
