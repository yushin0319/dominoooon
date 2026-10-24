// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import type { CardInstance, PendingEffect, SupplyPile } from '../../types';
import PendingEffectUI from '../PendingEffectUI';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick }: Record<string, unknown>) => {
      const props: Record<string, unknown> = { className, onClick };
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

function pending(type: PendingEffect['type']): PendingEffect {
  return { type, sourceCard: getCardDef('Workshop'), playerId: 'p1' };
}

const supply: SupplyPile[] = ['Copper', 'Silver', 'Cellar', 'Village'].map(
  (name) => ({ card: getCardDef(name), count: 10 }),
);

const hand: CardInstance[] = ['Copper', 'Estate', 'Smithy'].map((name, i) => ({
  instanceId: `${name}-${i}`,
  def: getCardDef(name),
}));

// 指でのタップ（互換のマウスイベントも含む）
function tapCard(nameJa: string) {
  const header = screen.getByText(nameJa, { selector: 'div' });
  const root = header.closest('[data-card-root]') as HTMLElement;
  fireEvent.pointerDown(root, { pointerType: 'touch', clientX: 5, clientY: 5 });
  fireEvent.pointerUp(root, { pointerType: 'touch', clientX: 5, clientY: 5 });
  fireEvent.mouseEnter(root);
  fireEvent.click(header, { detail: 1 });
}

describe('選択画面: 指でタップすると、選ぶのと一緒にカードの説明を出す', () => {
  it('工房の獲得: タップしたカードが選ばれ、説明が出る（確定はボタン）', () => {
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={pending('workshop')}
        hand={hand}
        discard={[]}
        supply={supply}
        onResolve={onResolve}
      />,
    );
    tapCard('地下貯蔵庫');
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      '手札を捨てて同数ドロー',
    );
    expect(
      screen.getByRole('button', { name: '地下貯蔵庫を獲得する' }),
    ).toBeEnabled();
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('地下貯蔵庫の捨て札選び（手札から選ぶ）でも、タップで説明が出る', () => {
    render(
      <PendingEffectUI
        pendingEffect={pending('cellar')}
        hand={hand}
        discard={[]}
        supply={supply}
        onResolve={() => {}}
      />,
    );
    tapCard('鍛冶屋');
    expect(screen.getByRole('tooltip')).toHaveTextContent('+3 ドロー');
  });
});
