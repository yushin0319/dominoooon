import { motion } from 'framer-motion';
import type { CardInstance, CardDef, CardType } from '../types';

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

function effectText(def: CardDef): string {
  const parts: string[] = [];
  const e = def.effects;
  if (e.cards) parts.push(`+${e.cards} ドロー`);
  if (e.actions) parts.push(`+${e.actions} アクション`);
  if (e.buys) parts.push(`+${e.buys} 購入`);
  if (e.coins) parts.push(`+${e.coins} コイン`);
  if (def.vpValue !== undefined) parts.push(`${def.vpValue} VP`);
  return parts.join('、');
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

export default function CardView({ card, onClick, selected, small, remaining }: CardViewProps) {
  const def = getDef(card);
  const gradient = getTypeGradient(def.types);
  const borderColor = getBorderColor(def.types);
  const effects = effectText(def);

  return (
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
      className={`
        relative rounded-lg border-2 ${borderColor}
        bg-gradient-to-br ${gradient}
        overflow-hidden
        ${small ? 'w-20 h-28 p-1' : 'w-[120px] h-[170px]'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        ${selected ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50' : 'shadow-xl'}
        ${onClick ? 'hover:shadow-2xl' : ''}
        transition-shadow duration-200
        flex flex-col
      `}
    >
      {/* Card Header */}
      <div className={`px-2 py-1 ${small ? 'text-[8px]' : 'text-[10px]'} font-bold text-white truncate bg-black/20`}>
        {def.nameJa}
      </div>

      {/* Card Content */}
      {!small && (
        <>
          <div className="flex-1 px-2 py-2 flex flex-col justify-center gap-1">
            <div className={`text-xs text-white/90 font-semibold ${borderColor.replace('border-', 'text-')}`}>
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
      <div className={`
        absolute ${small ? 'bottom-1 left-1 w-4 h-4 text-[8px]' : 'bottom-2 left-2 w-8 h-8 text-xs'}
        bg-slate-800/90 rounded-full flex items-center justify-center
        font-bold text-white border-2 ${borderColor}
      `}>
        {def.cost}
      </div>

      {/* 残数バッジ（右上に絶対配置） */}
      {remaining !== undefined && (
        <div className="absolute top-1 right-1 bg-slate-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border border-white/20 shadow-md">
          {remaining}
        </div>
      )}
    </motion.div>
  );
}
