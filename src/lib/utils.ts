import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CardDef } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** カード効果テキストを生成する共通ユーティリティ */
export function getEffectText(def: CardDef): string {
  const parts: string[] = [];
  const e = def.effects;
  if (e.cards) parts.push(`+${e.cards} ドロー`);
  if (e.actions) parts.push(`+${e.actions} アクション`);
  if (e.buys) parts.push(`+${e.buys} 購入`);
  if (e.coins) parts.push(`+${e.coins} コイン`);
  if (e.custom) parts.push('特殊効果');
  if (def.vpValue !== undefined) parts.push(`${def.vpValue} VP`);
  return parts.join('、');
}
