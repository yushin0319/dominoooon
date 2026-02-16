import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../types';
import CardView from './CardView';

interface PlayAreaProps {
  cards: CardInstance[];
}

export default function PlayArea({ cards }: PlayAreaProps) {
  return (
    <div className="flex items-center justify-center flex-wrap gap-2 p-6 min-h-[140px] rounded-lg border-2 border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/30">
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
}
