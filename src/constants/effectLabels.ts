/**
 * Effect labels for pending effect UI
 * Maps effect types to Japanese display labels
 */
export const EFFECT_LABELS: Record<string, string> = {
  cellar: '地下貯蔵庫: 好きな枚数を捨て、同数ドローする。',
  chapel: '礼拝堂: 手札から最大4枚を廃棄する。',
  workshop: '工房: コスト4以下のカードを1枚獲得する。',
  militia: '民兵: 手札が3枚になるまで捨てる。',
  poacher: '密猟者: カードを捨てる。',
  throneRoom: '玉座の間: 2回プレイするアクションを選ぶ。',
  harbinger: '先触れ: 捨て札からデッキの上に置くカードを選ぶ。',
  sentry: '歩哨: 廃棄するカードを選ぶ。',
  vassal: '家臣: めくったアクションカードをプレイしますか？',
  remodel: '改築: カードを選んでください。',
  mine: '鉱山: 廃棄する財宝カードを選んでください。',
  artisan: '職人: カードを選んでください。',
};

export function getEffectLabel(type: string): string {
  return EFFECT_LABELS[type] ?? `解決: ${type}`;
}
