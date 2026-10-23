import { getCardDef } from '../domain/card';
import type { PendingEffect, PendingEffectType } from '../types';

/**
 * 選択待ち画面の説明（段階の無いもの）。
 * 何を選ぶのか・選ぶと何が起きるのかを書く。
 */
export const EFFECT_LABELS: Partial<Record<PendingEffectType, string>> = {
  cellar: '地下貯蔵庫: 捨てるカードを選んでください。捨てた枚数だけ引きます。',
  chapel: '礼拝堂: 廃棄するカードを4枚まで選んでください。',
  workshop: '工房: コスト4以下のカードを1枚獲得します。',
  militia: '民兵: 手札が3枚になるまで捨ててください。',
  throneRoom: '玉座の間: 2回使うアクションカードを選んでください。',
  harbinger:
    '先触れ: 捨て札から1枚選ぶと、デッキの上に置きます（置かなくてもかまいません）。',
  sentry:
    '歩哨: デッキの上のカードを1枚ずつ、廃棄・捨てる・デッキに戻すから選んでください。',
  vassal: '家臣: デッキの上から捨てたアクションカードをプレイしますか？',
};

function cardNameJa(name: unknown): string {
  if (typeof name !== 'string') return 'カード';
  try {
    return getCardDef(name).nameJa;
  } catch {
    return name;
  }
}

/**
 * 種類と段階（data）から、選択待ち画面の題名を作る。
 * handSize（手札の枚数）は密猟者で手札が足りないときの説明に使う
 */
export function getEffectTitle(
  pending: Pick<PendingEffect, 'type' | 'data'>,
  handSize?: number,
): string {
  const data = pending.data ?? {};
  switch (pending.type) {
    case 'poacher': {
      const n = (data.discardCount as number) ?? 0;
      if (handSize !== undefined && handSize < n) {
        return `密猟者: 空のサプライが${n}山ありますが、手札が${handSize}枚なので全部捨ててください。`;
      }
      return `密猟者: 空のサプライが${n}山あるので、手札を${n}枚捨ててください。`;
    }
    case 'remodel':
      if (data.phase === 'gain') {
        const max = ((data.trashedCost as number) ?? 0) + 2;
        return `改築（2/2）: ${cardNameJa(data.trashedName)}を廃棄しました。コスト${max}以下のカードを1枚獲得します。`;
      }
      return '改築（1/2）: 廃棄するカードを手札から1枚選んでください。';
    case 'mine':
      if (data.phase === 'gain') {
        const max = ((data.trashedCost as number) ?? 0) + 3;
        return `鉱山（2/2）: ${cardNameJa(data.trashedName)}を廃棄しました。コスト${max}以下の財宝を1枚、手札に獲得します。`;
      }
      return '鉱山（1/2）: 廃棄する財宝カードを選んでください（廃棄しなくてもかまいません）。';
    case 'artisan':
      if (data.phase === 'putBack') {
        return '職人（2/2）: 手札から1枚選んで、デッキの上に戻します。';
      }
      return '職人（1/2）: コスト5以下のカードを1枚、手札に獲得します。';
    default:
      return EFFECT_LABELS[pending.type] ?? `解決: ${pending.type}`;
  }
}
