import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CardDef } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** custom効果の日本語テキスト */
const customEffectText: Record<string, string> = {
  cellar: '手札を捨てて同数ドロー',
  chapel: '手札から最大4枚廃棄',
  harbinger: '捨て札から1枚をデッキの上に',
  merchant: '銀貨プレイ時+1コイン',
  vassal: 'デッキ上を捨て、アクションなら使用可',
  workshop: 'コスト4以下を1枚獲得',
  bureaucrat: '銀貨獲得、他者は勝利点をデッキ上に',
  militia: '他者は手札3枚まで捨てる',
  moneylender: '銅貨を廃棄して+3コイン',
  poacher: '空サプライ1つにつき手札1枚捨てる',
  remodel: '手札1枚廃棄→コスト+2以下を獲得',
  throneRoom: 'アクション1枚を2回使用',
  bandit: '金貨獲得、他者の財宝を廃棄',
  councilRoom: '他プレイヤーは1枚ドロー',
  library: '手札7枚になるまでドロー',
  mine: '財宝を廃棄→コスト+3以下の財宝を手札に',
  sentry: 'デッキ上2枚を見て廃棄/捨て/戻す',
  witch: '他プレイヤーに呪いを配る',
  artisan: 'コスト5以下を手札に獲得、1枚をデッキ上に',
};

/** カード効果テキストを生成する共通ユーティリティ */
export function getEffectText(def: CardDef): string {
  const parts: string[] = [];
  const e = def.effects;
  if (e.cards) parts.push(`+${e.cards} ドロー`);
  if (e.actions) parts.push(`+${e.actions} アクション`);
  if (e.buys) parts.push(`+${e.buys} 購入`);
  if (e.coins) parts.push(`+${e.coins} コイン`);
  if (e.custom) parts.push(customEffectText[e.custom] ?? '特殊効果');
  if (def.vpValue !== undefined) parts.push(`${def.vpValue} VP`);
  return parts.join('、');
}
