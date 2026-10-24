import { describe, expect, it } from 'vitest';
import { getCardDef } from '../../domain/card';
import type { CardInstance, SupplyPile } from '../../types';
import {
  getHandCardStatus,
  getSupplyPileStatus,
  hasPlayableCard,
} from '../cardStatus';

function inst(name: string): CardInstance {
  return { instanceId: `${name}-1`, def: getCardDef(name) };
}

function pile(name: string, count = 10): SupplyPile {
  return { card: getCardDef(name), count };
}

describe('getHandCardStatus（手札のカードが今プレイできるか）', () => {
  it.each([
    {
      name: '工房（アクション）は使える',
      card: 'Workshop',
      expected: 'available',
    },
    {
      name: '民兵（アクション・アタック）は使える',
      card: 'Militia',
      expected: 'available',
    },
    {
      name: '堀（アクション・リアクション）は使える',
      card: 'Moat',
      expected: 'available',
    },
    { name: '銅貨（財宝）は使えない', card: 'Copper', expected: 'unavailable' },
    {
      name: '屋敷（勝利点）は使えない',
      card: 'Estate',
      expected: 'unavailable',
    },
    { name: '呪いは使えない', card: 'Curse', expected: 'unavailable' },
  ])('アクションをプレイできる場面で、$name', ({ card, expected }) => {
    expect(getHandCardStatus(inst(card), true)).toBe(expected);
  });

  it('アクションをプレイできない場面（購入フェーズ・アクション 0・相手の番）では、どのカードにも印を付けない', () => {
    expect(getHandCardStatus(inst('Workshop'), false)).toBeUndefined();
    expect(getHandCardStatus(inst('Copper'), false)).toBeUndefined();
  });
});

describe('hasPlayableCard（案内文を出すかどうか）', () => {
  it('アクションカードが 1 枚でもあれば true', () => {
    expect(
      hasPlayableCard([inst('Copper'), inst('Estate'), inst('Workshop')], true),
    ).toBe(true);
  });

  it('アクションカードが無ければ false（銅貨と屋敷だけの手札）', () => {
    expect(hasPlayableCard([inst('Copper'), inst('Estate')], true)).toBe(false);
  });

  it('プレイできない場面では、アクションカードがあっても false', () => {
    expect(hasPlayableCard([inst('Workshop')], false)).toBe(false);
  });

  it('手札が空なら false', () => {
    expect(hasPlayableCard([], true)).toBe(false);
  });
});

describe('getSupplyPileStatus（サプライのカードが今買えるか）', () => {
  it('コストが手持ちのコイン以下なら買える（境界値: ちょうど同じ）', () => {
    expect(getSupplyPileStatus(pile('Silver'), true, 3)).toBe('available');
    expect(getSupplyPileStatus(pile('Copper'), true, 3)).toBe('available');
  });

  it('コストが手持ちのコインより高ければ買えない', () => {
    expect(getSupplyPileStatus(pile('Gold'), true, 3)).toBe('unavailable');
  });

  it('売り切れなら、コインが足りていても買えない', () => {
    expect(getSupplyPileStatus(pile('Copper', 0), true, 8)).toBe('unavailable');
  });

  it('購入フェーズでない（買えない場面）なら印を付けない', () => {
    expect(
      getSupplyPileStatus(pile('Copper'), false, undefined),
    ).toBeUndefined();
    expect(getSupplyPileStatus(pile('Copper'), false, 5)).toBeUndefined();
  });

  it('買える場面でもコインの値が無ければ印を付けない', () => {
    expect(
      getSupplyPileStatus(pile('Copper'), true, undefined),
    ).toBeUndefined();
  });
});
