import { AnimatePresence, motion } from 'framer-motion';
import { memo } from 'react';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface PlayAreaProps {
  cards: CardInstance[];
  /** 誰の場かの札（AI の番だけ「AIの場」と出す。自分の番は出さない） */
  ownerLabel?: string;
}

const PlayArea = memo(function PlayArea({ cards, ownerLabel }: PlayAreaProps) {
  return (
    // 高さはカードが無いときも、あるとき（小さいカード 112px + 上下の余白 + 枠）と同じにする（最初の 1 枚で画面が動かないように）
    <div
      data-play-area=""
      className="relative flex items-center justify-center flex-wrap gap-2 p-4 min-h-[148px] rounded-lg border-2 border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30"
    >
      {/* 札は高さを変えないよう右上に重ねる（PC は左端が GameLog の下に隠れるので右） */}
      {ownerLabel && (
        <span className="absolute top-1.5 right-2 px-2 py-0.5 rounded bg-slate-700 text-[11px] font-bold text-slate-100 pointer-events-none">
          {ownerLabel}
        </span>
      )}
      <AnimatePresence mode="popLayout">
        {cards.length === 0 ? (
          <div className="text-sm text-slate-400 dark:text-slate-500 italic">
            プレイエリア（カードなし）
          </div>
        ) : (
          cards.map((card) => (
            <motion.div
              key={card.instanceId}
              initial={{ scale: 0.5, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.3, opacity: 0, y: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              layout
            >
              <CardView card={card} small />
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
});

export default PlayArea;
