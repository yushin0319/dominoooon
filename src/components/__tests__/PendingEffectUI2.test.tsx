// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CardDef, PendingEffect, SupplyPile } from '../../types';
import { CardType } from '../../types';
import PendingEffectUI from '../PendingEffectUI';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {};
      if (className) props.className = className;
      if (onClick) props.onClick = onClick;
      if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// テスト用ヘルパー
function makeCardDef(
  name: string,
  cost: number,
  types: CardType[] = [CardType.Action],
): CardDef {
  return {
    name,
    nameJa: name,
    cost,
    types,
    effects: {},
  };
}

function makeSupplyPile(
  name: string,
  cost: number,
  count: number,
  types: CardType[] = [CardType.Action],
): SupplyPile {
  return {
    card: makeCardDef(name, cost, types),
    count,
  };
}

function makePendingEffect(
  type: PendingEffect['type'],
  data?: Record<string, unknown>,
): PendingEffect {
  return {
    type,
    sourceCard: makeCardDef(type, 0),
    playerId: 'p1',
    data,
  };
}

// ===== SupplySelectUI レンダリングテスト =====

describe('PendingEffectUI - SupplySelectUI', () => {
  it('shows maxCost in the title for workshop (cost 4)', () => {
    const supply = [
      makeSupplyPile('Village', 3, 10),
      makeSupplyPile('Market', 5, 10),
    ];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        discard={[]}
        supply={supply}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading').textContent).toContain('コスト4以下');
  });

  it('filters out cards exceeding maxCost', () => {
    const supply = [
      makeSupplyPile('Village', 3, 10),
      makeSupplyPile('Market', 5, 10),
    ];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        discard={[]}
        supply={supply}
        onResolve={vi.fn()}
      />,
    );
    // Village（コスト3）は表示される（ツールチップ+カードヘッダーで2回）
    expect(screen.getAllByText('Village').length).toBeGreaterThanOrEqual(1);
    // Market（コスト5）はフィルタされ非表示
    expect(screen.queryByText('Market')).not.toBeInTheDocument();
  });

  it('filters out empty supply piles', () => {
    const supply = [
      makeSupplyPile('Village', 3, 0),
      makeSupplyPile('Smithy', 4, 5),
    ];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        discard={[]}
        supply={supply}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.queryByText('Village')).not.toBeInTheDocument();
    // Smithy はツールチップ+カードヘッダーで複数表示される
    expect(screen.getAllByText('Smithy').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onResolve with selectedCardName after selecting and confirming', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const supply = [makeSupplyPile('Village', 3, 10)];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        discard={[]}
        supply={supply}
        onResolve={onResolve}
      />,
    );
    // CardViewはツールチップ(index 0)+カードヘッダー(index 1)で2回表示
    // カードヘッダーのクリックがmotion.divのonClickに伝搬
    const villageElements = screen.getAllByText('Village');
    await user.click(villageElements[1]);
    await user.click(screen.getByText('Villageを獲得する'));
    expect(onResolve).toHaveBeenCalledWith({ selectedCardName: 'Village' });
  });
});

// ===== ConfirmUI レンダリングテスト =====

describe('PendingEffectUI - ConfirmUI', () => {
  it('renders yes/no buttons for vassal effect', () => {
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('vassal')}
        hand={[]}
        discard={[]}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByText('めくったカードをプレイする')).toBeInTheDocument();
    expect(screen.getByText('プレイしない')).toBeInTheDocument();
  });

  it('calls onResolve with confirmed=true when yes is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('vassal')}
        hand={[]}
        discard={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('めくったカードをプレイする'));
    expect(onResolve).toHaveBeenCalledWith({ confirmed: true });
  });

  it('calls onResolve with confirmed=false when no is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('vassal')}
        hand={[]}
        discard={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('プレイしない'));
    expect(onResolve).toHaveBeenCalledWith({ confirmed: false });
  });
});
