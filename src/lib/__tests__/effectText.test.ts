// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, getCardDef } from '../../domain/card';
import { getEffectText } from '../utils';

describe('getEffectText: カードの効果の文（カード・説明・ログに出る）', () => {
  it('勝利点は日本語で書く（「1 VP」と英語が出ていた）', () => {
    expect(getEffectText(getCardDef('Estate'))).toBe('1 勝利点');
    expect(getEffectText(getCardDef('Province'))).toBe('6 勝利点');
    expect(getEffectText(getCardDef('Curse'))).toBe('-1 勝利点');
  });

  it('ほかの効果の書き方は変えない', () => {
    expect(getEffectText(getCardDef('Village'))).toBe(
      '+1 ドロー、+2 アクション',
    );
  });

  it('密猟者の説明は、画面の「空の山」と同じ言葉で短く書く（「空サプライ」と言い方が分かれ、手札のカードで 5 行になって絵が隠れていた）', () => {
    expect(getEffectText(getCardDef('Poacher'))).toBe(
      '+1 ドロー、+1 アクション、+1 コイン、空の山の数だけ手札を捨てる',
    );
  });

  it('庭園にも効果の文がある（セットアップ画面・説明で空欄だった）', () => {
    expect(getEffectText(getCardDef('Gardens'))).toBe(
      '自分のカード10枚につき1勝利点',
    );
  });

  it('キングダムに選べるカードはどれも効果の文がある', () => {
    const blank = Object.values(CARD_DEFS)
      .filter((def) => def.cost > 0 || def.vpValue !== undefined)
      .filter((def) => getEffectText(def) === '')
      .map((def) => def.name);
    expect(blank).toEqual([]);
  });

  it('どのカードの効果にも英語が残っていない', () => {
    const english = Object.values(CARD_DEFS)
      .map((def) => getEffectText(def))
      .filter((text) => /[A-Za-z]{2,}/.test(text));
    expect(english).toEqual([]);
  });
});
