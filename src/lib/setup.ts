import type { AIStrategy } from '../types';

/** キングダムに選ぶカードの枚数 */
export const KINGDOM_SIZE = 10;

/** added = 選んだ / removed = 外した / full = もう 10 枚選んでいるので選べなかった */
type KingdomToggleResult = 'added' | 'removed' | 'full';

/**
 * キングダムのカードを押したときの選び直し。選んでいれば外し、選んでいなければ足す。
 * 10 枚選んだあとに別のカードを押したら足さずに full を返す（画面で「外してから選んで」と知らせる。
 * 以前は何の反応もなく、押せていないのか分からなかった）
 */
export function toggleKingdomCard(
  selected: ReadonlySet<string>,
  name: string,
): { next: Set<string>; result: KingdomToggleResult } {
  const next = new Set(selected);
  if (next.has(name)) {
    next.delete(name);
    return { next, result: 'removed' };
  }
  if (next.size >= KINGDOM_SIZE) return { next, result: 'full' };
  next.add(name);
  return { next, result: 'added' };
}

interface AIStrategyOption {
  value: AIStrategy;
  label: string;
  description: string;
}

/** AI の戦略の名前と説明（「Big Money」「+ Smithy」と英語の名前だけで、何をするのか分からなかった） */
export const AI_STRATEGIES: AIStrategyOption[] = [
  {
    value: 'bigMoney',
    label: 'お金重視',
    description:
      '財宝と属州だけを買う（8 コインで属州、6 で金貨、3 で銀貨）。アクションカードは使わない',
  },
  {
    value: 'bigMoneySmithy',
    label: 'お金重視＋鍛冶屋',
    description: 'お金重視に加えて、鍛冶屋（+3 ドロー）を 2 枚まで買って使う',
  },
];

/** 選んだ戦略とキングダムの組み合わせについての注意（鍛冶屋が無いのに鍛冶屋を使う戦略、など）。無ければ null */
export function getStrategyNote(
  strategy: AIStrategy,
  kingdom: ReadonlySet<string>,
): string | null {
  if (strategy === 'bigMoneySmithy' && !kingdom.has('Smithy')) {
    return 'キングダムに鍛冶屋が無いので、お金重視と同じ動きになります';
  }
  return null;
}
