import { motion } from 'framer-motion';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface HandProps {
  hand: CardInstance[];
  onPlay?: (instanceId: string) => void;
  canPlay?: boolean;
  selectedCards?: string[];
}

export default function Hand({ hand, onPlay, canPlay, selectedCards }: HandProps) {
  const fanAngle = 5;
  const totalCards = hand.length;

  return (
    <div className="relative flex flex-col items-center justify-end p-2 rounded-xl bg-white/5 min-h-[200px]">
      {/* Help text for card interaction */}
      {canPlay && onPlay && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-slate-400 dark:text-slate-500 font-medium">
          カードをクリックしてプレイ
        </div>
      )}
      <div className="flex items-end justify-center">
        {hand.map((card, index) => {
          const centerIdx = (totalCards - 1) / 2;
          const rotation = (index - centerIdx) * fanAngle;
          const yOffset = Math.abs(index - centerIdx) * 6;
          const isSelected = selectedCards?.includes(card.instanceId);

          return (
            <motion.div
              key={card.instanceId}
              drag={canPlay && onPlay}
              dragSnapToOrigin={true}
              dragElastic={0.1}
              initial={{ y: 100, opacity: 0 }}
              animate={{
                y: isSelected ? yOffset - 30 : yOffset,
                opacity: 1,
                rotate: rotation,
                scale: isSelected ? 1.05 : 1,
              }}
              whileHover={
                canPlay && onPlay
                  ? {
                      y: yOffset - 30,
                      scale: 1.08,
                      rotate: 0,
                      zIndex: 50,
                    }
                  : undefined
              }
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                marginLeft: index === 0 ? 0 : -16,
                zIndex: isSelected ? 100 : index,
              }}
              className={`
                ${canPlay && onPlay ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
              `}
            >
              <CardView
                card={card}
                selected={isSelected}
                onClick={canPlay && onPlay ? () => onPlay(card.instanceId) : undefined}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
