// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EFFECT_LABELS, getEffectTitle } from '../../constants/effectLabels';
import type { CardDef, CardInstance, PendingEffect } from '../../types';
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

function makeCardInstance(
  name: string,
  cost = 0,
  types: CardType[] = [CardType.Action],
): CardInstance {
  return {
    instanceId: `inst-${name}-${Math.random().toString(36).slice(2, 6)}`,
    def: makeCardDef(name, cost, types),
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

// ===== 既存のスモークテスト =====

describe('PendingEffectUI - labels', () => {
  it('段階の無い選択待ちは種類ごとの説明を返す', () => {
    expect(getEffectTitle({ type: 'cellar' })).toBe(EFFECT_LABELS.cellar);
    expect(EFFECT_LABELS.cellar).toContain('捨てた枚数だけ引きます');
    expect(getEffectTitle({ type: 'chapel' })).toContain('4枚まで');
    expect(getEffectTitle({ type: 'workshop' })).toContain('コスト4以下');
  });

  it('改築は段階ごとに説明が変わり、獲得段階では廃棄したカード名と上限コストを出す', () => {
    expect(
      getEffectTitle({ type: 'remodel', data: { phase: 'trash' } }),
    ).toContain('改築（1/2）: 廃棄するカード');
    const gain = getEffectTitle({
      type: 'remodel',
      data: { phase: 'gain', trashedCost: 2, trashedName: 'Estate' },
    });
    expect(gain).toContain('改築（2/2）');
    expect(gain).toContain('屋敷を廃棄しました');
    expect(gain).toContain('コスト4以下');
  });

  it('鉱山の獲得段階は廃棄した財宝と上限コストを出す', () => {
    const gain = getEffectTitle({
      type: 'mine',
      data: { phase: 'gain', trashedCost: 0, trashedName: 'Copper' },
    });
    expect(gain).toContain('銅貨を廃棄しました');
    expect(gain).toContain('コスト3以下の財宝');
  });

  it('職人の 2 段階目はデッキの上に戻すと書く', () => {
    expect(
      getEffectTitle({ type: 'artisan', data: { phase: 'gain' } }),
    ).toContain('職人（1/2）');
    expect(
      getEffectTitle({ type: 'artisan', data: { phase: 'putBack' } }),
    ).toContain('デッキの上に戻します');
  });

  it('密猟者は捨てる枚数を出す', () => {
    expect(
      getEffectTitle({ type: 'poacher', data: { discardCount: 2 } }),
    ).toContain('手札を2枚捨ててください');
    // 手札が足りないときは全部捨てればよいと書く
    expect(
      getEffectTitle({ type: 'poacher', data: { discardCount: 2 } }, 1),
    ).toContain('手札が1枚なので全部捨ててください');
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
        discard={[]}
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
        discard={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );
    await user.click(screen.getByText('スキップ'));
    expect(onResolve).toHaveBeenCalledWith({ selectedCards: [] });
  });

  it('renders confirm button and selection counter when hand has cards', () => {
    const hand = [
      makeCardInstance('Copper', 0, [CardType.Treasure]),
      makeCardInstance('Estate', 2, [CardType.Victory]),
    ];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('cellar')}
        hand={hand}
        discard={[]}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    expect(screen.getByText('捨てずに終える')).toBeInTheDocument();
    expect(screen.getByText('0枚選択中')).toBeInTheDocument();
  });

  it('shows maxSelect instruction for chapel (max 4)', () => {
    const hand = [makeCardInstance('Copper')];
    render(
      <PendingEffectUI
        pendingEffect={makePendingEffect('chapel')}
        hand={hand}
        discard={[]}
        supply={[]}
        onResolve={vi.fn()}
      />,
    );
    // 選んだ枚数 / 上限 を出す
    expect(screen.getByText('0/4枚')).toBeInTheDocument();
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
        discard={[]}
        supply={[]}
        onResolve={onResolve}
      />,
    );

    // ツールチップはホバー中だけ body 直下に出るので、カードの名前の欄（ツールチップの外）を押す。
    // カードヘッダーのクリックがmotion.divに伝搬
    const [copperHeader] = screen
      .getAllByText('Copper')
      .filter((el) => !el.closest('[role="tooltip"]'));
    await user.click(copperHeader);
    await user.click(screen.getByText('1枚捨てて1枚引く'));
    expect(onResolve).toHaveBeenCalledWith({
      selectedCards: [card1.instanceId],
    });
  });
});
