// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CARD_DEFS } from '../../domain/card';
import {
  AI_STRATEGIES,
  getStrategyNote,
  KINGDOM_SIZE,
  toggleKingdomCard,
} from '../setup';

const ten = [
  'Cellar',
  'Chapel',
  'Moat',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Mine',
];

describe('toggleKingdomCard: キングダムのカードを選ぶ・外す（10 枚まで）', () => {
  it('選んでいないカードは足す', () => {
    const { next, result } = toggleKingdomCard(new Set(['Cellar']), 'Moat');
    expect(result).toBe('added');
    expect([...next]).toEqual(['Cellar', 'Moat']);
  });

  it('選んでいるカードは外す', () => {
    const { next, result } = toggleKingdomCard(
      new Set(['Cellar', 'Moat']),
      'Cellar',
    );
    expect(result).toBe('removed');
    expect([...next]).toEqual(['Moat']);
  });

  it('10 枚選んだあとに別のカードを押したら、足さずに full を返す（何の反応もなかった）', () => {
    const selected = new Set(ten);
    const { next, result } = toggleKingdomCard(selected, 'Witch');
    expect(result).toBe('full');
    expect(next.size).toBe(KINGDOM_SIZE);
    expect(next.has('Witch')).toBe(false);
  });

  it('10 枚選んでいても、選んでいるカードは外せる', () => {
    const { next, result } = toggleKingdomCard(new Set(ten), 'Smithy');
    expect(result).toBe('removed');
    expect(next.size).toBe(9);
  });

  it('元の Set は変えない', () => {
    const selected = new Set(['Cellar']);
    toggleKingdomCard(selected, 'Moat');
    expect([...selected]).toEqual(['Cellar']);
  });
});

describe('AI の戦略（日本語の名前と説明）', () => {
  it('2 つとも日本語の名前と説明がある（「Big Money」と英語だけだった）', () => {
    expect(AI_STRATEGIES.map((s) => s.value)).toEqual([
      'bigMoney',
      'bigMoneySmithy',
    ]);
    for (const s of AI_STRATEGIES) {
      expect(s.label).not.toMatch(/[A-Za-z]/);
      expect(s.description).not.toMatch(/[A-Za-z]/);
      expect(s.description.length).toBeGreaterThan(10);
    }
  });

  it('鍛冶屋を使う戦略で、キングダムに鍛冶屋が無いときは注意を出す', () => {
    const without = new Set(ten.filter((n) => n !== 'Smithy'));
    expect(getStrategyNote('bigMoneySmithy', without)).toMatch(/鍛冶屋/);
    expect(getStrategyNote('bigMoneySmithy', new Set(ten))).toBeNull();
    expect(getStrategyNote('bigMoney', without)).toBeNull();
  });

  it('鍛冶屋はカードの定義にある（名前を打ち間違えていない）', () => {
    expect(CARD_DEFS.Smithy.nameJa).toBe('鍛冶屋');
  });
});
