import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import type { CardInstance, CardDef, CardType } from '../types';
import { cn, getEffectText } from '../lib/utils';

interface CardViewProps {
  card: CardInstance | CardDef;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  remaining?: number; // 残数バッジ用
}

function getDef(card: CardInstance | CardDef): CardDef {
  return 'def' in card ? card.def : card;
}

function getTypeGradient(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'from-red-600 to-red-800';
  if (types.includes('Reaction' as CardType)) return 'from-blue-600 to-blue-800';
  if (types.includes('Treasure' as CardType)) return 'from-amber-600 to-amber-800';
  if (types.includes('Victory' as CardType)) return 'from-green-600 to-green-800';
  if (types.includes('Curse' as CardType)) return 'from-purple-600 to-purple-800';
  return 'from-gray-600 to-gray-800';
}

function getBorderColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'border-red-500';
  if (types.includes('Reaction' as CardType)) return 'border-blue-500';
  if (types.includes('Treasure' as CardType)) return 'border-amber-400';
  if (types.includes('Victory' as CardType)) return 'border-green-400';
  if (types.includes('Curse' as CardType)) return 'border-purple-500';
  if (types.includes('Action' as CardType)) return 'border-gray-400';
  return 'border-gray-500';
}

function getTextColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'text-red-400';
  if (types.includes('Reaction' as CardType)) return 'text-blue-400';
  if (types.includes('Treasure' as CardType)) return 'text-amber-300';
  if (types.includes('Victory' as CardType)) return 'text-green-300';
  if (types.includes('Curse' as CardType)) return 'text-purple-400';
  if (types.includes('Action' as CardType)) return 'text-gray-300';
  return 'text-gray-400';
}

function typeNameJa(type: CardType): string {
  const map: Record<string, string> = {
    Action: 'アクション',
    Treasure: '財宝',
    Victory: '勝利点',
    Curse: '呪い',
    Attack: 'アタック',
    Reaction: 'リアクション',
  };
  return map[type] ?? type;
}

const CardView = memo(function CardView({ card, onClick, selected, small, remaining }: CardViewProps) {
  const def = getDef(card);
  const gradient = getTypeGradient(def.types);
  const borderColor = getBorderColor(def.types);
  const textColor = getTextColor(def.types);
  const effects = getEffectText(def);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip - CSS transition（framer-motion 不使用） */}
      <div
        className={cn(
          'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3',
          'bg-slate-900 border-2 border-slate-600 rounded-lg shadow-2xl text-white text-sm pointer-events-none',
          'transition-all duration-200 ease-out',
          showTooltip
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 invisible',
        )}
      >
        <div className="font-bold text-base mb-2">{def.nameJa}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">コスト:</span>
            <span className="font-semibold">{def.cost}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">種類:</span>
            <span className={cn('font-semibold', textColor)}>
              {def.types.map(typeNameJa).join(' / ')}
            </span>
          </div>
          {effects && (
            <div className="flex items-start gap-2">
              <span className="text-slate-400">効果:</span>
              <span>{effects}</span>
            </div>
          )}
          {def.vpValue !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400">勝利点:</span>
              <span className="font-semibold">{def.vpValue}</span>
            </div>
          )}
        </div>
        {/* 矢印 */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
          <div className="border-8 border-transparent border-t-slate-600" />
        </div>
      </div>

      <motion.div
      onClick={onClick}
      whileHover={
        onClick
          ? {
              scale: 1.08,
              y: -30,
            }
          : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={cn(
        'relative rounded-lg border-2 overflow-hidden flex flex-col transition-shadow duration-200',
        'bg-gradient-to-br',
        gradient,
        borderColor,
        small ? 'w-20 h-28 p-1' : 'w-[120px] h-[170px]',
        onClick ? 'cursor-pointer hover:shadow-2xl' : 'cursor-default',
        selected ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50' : 'shadow-xl',
      )}
    >
      {/* Card Header */}
      <div className={cn(
        'px-2 py-1 font-bold text-white truncate bg-black/20',
        small ? 'text-[11px]' : 'text-[11px]',
      )}>
        {def.nameJa}
      </div>

      {/* Card Content */}
      {!small && (
        <>
          <div className="flex-1 px-2 py-2 flex flex-col justify-center gap-1">
            <div className={cn('text-xs font-semibold', textColor)}>
              {def.types.map(typeNameJa).join(' / ')}
            </div>
            {effects && (
              <div className="text-xs text-white/80 leading-tight">
                {effects}
              </div>
            )}
          </div>
        </>
      )}

      {/* Cost Badge - Absolute positioned at bottom-left */}
      <div className={cn(
        'absolute bg-slate-800/90 rounded-full flex items-center justify-center font-bold text-white border-2',
        borderColor,
        small ? 'bottom-1 left-1 w-4 h-4 text-[11px]' : 'bottom-2 left-2 w-8 h-8 text-xs',
      )}>
        {def.cost}
      </div>

      {/* 残数バッジ（右上に絶対配置） */}
      {remaining !== undefined && (
        <div className="absolute top-1 right-1 bg-slate-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border border-white/20 shadow-md">
          {remaining}
        </div>
      )}
    </motion.div>
    </div>
  );
});

export default CardView;
