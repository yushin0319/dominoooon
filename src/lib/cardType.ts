import type { CardType } from '../types';

/** カードの種類の文字の色（ゲーム中のカード・説明・セットアップ画面で同じ色にする） */
export function getTextColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'text-red-400';
  if (types.includes('Reaction' as CardType)) return 'text-blue-400';
  if (types.includes('Treasure' as CardType)) return 'text-amber-300';
  if (types.includes('Victory' as CardType)) return 'text-green-300';
  if (types.includes('Curse' as CardType)) return 'text-purple-400';
  if (types.includes('Action' as CardType)) return 'text-gray-300';
  return 'text-gray-400';
}

const TYPE_NAME_JA: Record<string, string> = {
  Action: 'アクション',
  Treasure: '財宝',
  Victory: '勝利点',
  Curse: '呪い',
  Attack: 'アタック',
  Reaction: 'リアクション',
};

/** カードの種類の日本語名 */
export function typeNameJa(type: CardType): string {
  return TYPE_NAME_JA[type] ?? type;
}
