// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import type { SupplyPile } from '../../types';
import SupplyArea from '../SupplyArea';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {
        className,
        onClick,
        'data-status': rest['data-status'],
      };
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

function makeSupply(): SupplyPile[] {
  return [
    ...['Copper', 'Silver', 'Gold', 'Estate', 'Duchy', 'Province', 'Curse'],
    ...['Cellar', 'Chapel', 'Workshop', 'Smithy', 'Market'],
  ].map((name) => ({
    card: getCardDef(name),
    count: name === 'Chapel' ? 0 : 10,
  }));
}

// サプライのカード本体（data-status を持つ要素）
function cardOf(nameJa: string): HTMLElement {
  return screen.getByText(nameJa, { selector: 'div' })
    .parentElement as HTMLElement;
}

describe('SupplyArea: 購入フェーズの買える・買えないの見分け', () => {
  it('コイン 3 なら、コスト 3 以下だけ押せる（銀貨は買える・金貨は押しても何も起きない）', () => {
    const onBuy = vi.fn();
    render(
      <SupplyArea supply={makeSupply()} onBuy={onBuy} canBuy maxCost={3} />,
    );
    fireEvent.click(cardOf('金貨'));
    expect(onBuy).not.toHaveBeenCalled();
    fireEvent.click(cardOf('銀貨'));
    expect(onBuy).toHaveBeenCalledWith('Silver');
  });

  it('買えるカードは光る枠（available）、買えないカードは暗く（unavailable）', () => {
    render(
      <SupplyArea supply={makeSupply()} onBuy={() => {}} canBuy maxCost={3} />,
    );
    expect(cardOf('銀貨').dataset.status).toBe('available');
    expect(cardOf('工房').dataset.status).toBe('available');
    expect(cardOf('金貨').dataset.status).toBe('unavailable');
    expect(cardOf('鍛冶屋').dataset.status).toBe('unavailable');
  });

  it('「コイン不足」のバッジは画面に出さない（コストの数字を隠していた）。読み上げ用の文だけ残す', () => {
    render(
      <SupplyArea supply={makeSupply()} onBuy={() => {}} canBuy maxCost={2} />,
    );
    const texts = screen.queryAllByText(/コイン不足/);
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.every((el) => el.classList.contains('sr-only'))).toBe(true);
  });

  it('売り切れはカードの中央に出す（コストの丸に重ねない）', () => {
    render(
      <SupplyArea supply={makeSupply()} onBuy={() => {}} canBuy maxCost={5} />,
    );
    const label = screen.getByText('売り切れ');
    expect(cardOf('礼拝堂').dataset.status).toBe('unavailable');
    expect(label.closest('.inset-0')).not.toBeNull();
  });

  it('購入フェーズでなければ、どのカードにも印を付けない', () => {
    render(<SupplyArea supply={makeSupply()} />);
    expect(cardOf('銀貨').dataset.status).toBeUndefined();
    expect(cardOf('金貨').dataset.status).toBeUndefined();
  });
});

describe('SupplyArea: 見出し', () => {
  it('「キングダム」「基本カード」は暗い背景で読める明るい色にする（半透明にしない）', () => {
    render(<SupplyArea supply={makeSupply()} />);
    for (const text of ['キングダム', '基本カード']) {
      const h = screen.getByRole('heading', { name: text });
      expect(h.className).toMatch(/text-slate-300/);
      expect(h.className).not.toMatch(/opacity-/);
    }
  });
});
