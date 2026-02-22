// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EFFECT_LABELS } from '../../constants/effectLabels';
import PendingEffectUI from '../PendingEffectUI';
import type { PendingEffect, CardInstance, SupplyPile, CardDef } from '../../types';
import { CardType } from '../../types';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...rest }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {};
      if (className) props.className = className;
      if (onClick) props.onClick = onClick;
      if (rest['data-testid']) props['data-testid'] = rest['data-testid'];
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// テスト用ヘルパー
function makeCardDef(name: string, cost: number, types: CardType[] = [CardType.Action]): CardDef {
  return {
    name,
    nameJa: name,
    cost,
    types,
    effects: {},
  };
}

function makeCardInstance(name: string, cost = 0, types: CardType[] = [CardType.Action]): CardInstance {
  return {
    instanceId: `inst-${name}-${Math.random().toString(36).slice(2, 6)}`,
    def: makeCardDef(name, cost, types),
  };
}

function makeSupplyPile(name: string, cost: number, count: number, types: CardType[] = [CardType.Action]): SupplyPile {
  return {
    card: makeCardDef(name, cost, types),
    count,
  };
}

function makePendingEffect(type: PendingEffect['type'], data?: Record<string, unknown>): PendingEffect {
  return {
    type,
    sourceCard: makeCardDef(type, 0),
    playerId: 'p1',
    data,
  };
}

// ===== 既存のスモークテスト =====

describe('PendingEffectUI - labels', () => {
  it('effect label helper returns correct label for cellar', () => {
    expect(EFFECT_LABELS['cellar']).toBe('地下貯蔵庫: 好きな枚数を捨て、同数ドローする。');
  });

  it('effect label helper returns correct label for chapel', () => {
    expect(EFFECT_LABELS['chapel']).toBe('礼拝堂: 手札から最大4枚を廃棄する。');
  });

  it('effect label helper returns correct label for workshop', () => {
    expect(EFFECT_LABELS['workshop']).toBe('工房: コスト4以下のカードを1枚獲得する。');
  });
});

// ===== CardSelectUI レンダリングテスト =====

describe('PendingEffectUI - CardSelectUI', () => {
  it('shows skip button when hand is empty', () => {
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('cellar')}
        hand={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    expect(screen.getByText('スキップ')).toBeInTheDocument();
    expect(screen.getByText('手札がありません')).toBeInTheDocument();
  });

  it('calls onResolve with empty selectedCards when skip is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('cellar')}
        hand={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('スキップ'));
    expect(onResolve).toHaveBeenCalledWith({ selectedCards: [] });
  });

  it('renders confirm button and selection counter when hand has cards', () => {
    const hand = [makeCardInstance('Copper', 0, [CardType.Treasure]), makeCardInstance('Estate', 2, [CardType.Victory])];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('cellar')}
        hand={hand}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByText('確定')).toBeInTheDocument();
    expect(screen.getByText('選択中: 0枚')).toBeInTheDocument();
  });

  it('shows maxSelect instruction for chapel (max 4)', () => {
    const hand = [makeCardInstance('Copper')];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('chapel')}
        hand={hand}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    // h2タイトルにも「最大4枚」が含まれるので、instruction用のpタグを検証
    const instruction = screen.getByText(/カードをクリックして選択してください/);
    expect(instruction.textContent).toContain('最大4枚');
  });

  it('calls onResolve with selected card instanceIds on confirm', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const card1 = makeCardInstance('Copper', 0, [CardType.Treasure]);
    const card2 = makeCardInstance('Estate', 2, [CardType.Victory]);
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('cellar')}
        hand={[card1, card2]}
        supply={[]}
        onResolve={onResolve}
      />,
    );

    // CardViewはツールチップ(index 0)+カードヘッダー(index 1)で2回nameJa表示
    // ツールチップにはonClickなし、カードヘッダーのクリックがmotion.divに伝搬
    const copperElements = screen.getAllByText('Copper');
    await user.click(copperElements[1]);
    await user.click(screen.getByText('確定'));
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [card1.instanceId],
    });
  });
});

// ===== SupplySelectUI レンダリングテスト =====

describe('PendingEffectUI - SupplySelectUI', () => {
  it('shows maxCost instruction for workshop (cost 4)', () => {
    const supply = [
      makeSupplyPile('Village', 3, 10),
      makeSupplyPile('Market', 5, 10),
    ];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        supply={supply}
        onResolve={vi.fn()}
      />,
    );
    // h2タイトルにも「コスト4以下」が含まれるので、instruction用のpタグを検証
    const instruction = screen.getByText(/獲得するカードをクリックしてください/);
    expect(instruction.textContent).toContain('コスト4以下');
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
        supply={supply}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.queryByText('Village')).not.toBeInTheDocument();
    // Smithy はツールチップ+カードヘッダーで複数表示される
    expect(screen.getAllByText('Smithy').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onResolve with selectedCardName when supply card is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    const supply = [makeSupplyPile('Village', 3, 10)];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('workshop')}
        hand={[]}
        supply={supply}
        onResolve={onResolve}
      />,
    );
    // CardViewはツールチップ(index 0)+カードヘッダー(index 1)で2回表示
    // カードヘッダーのクリックがmotion.divのonClickに伝搬
    const villageElements = screen.getAllByText('Village');
    await user.click(villageElements[1]);
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
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByText('はい')).toBeInTheDocument();
    expect(screen.getByText('いいえ')).toBeInTheDocument();
  });

  it('calls onResolve with confirmed=true when yes is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('vassal')}
        hand={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('はい'));
    expect(onResolve).toHaveBeenCalledWith({ confirmed: true });
  });

  it('calls onResolve with confirmed=false when no is clicked', async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('vassal')}
        hand={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('いいえ'));
    expect(onResolve).toHaveBeenCalledWith({ confirmed: false });
  });
});
