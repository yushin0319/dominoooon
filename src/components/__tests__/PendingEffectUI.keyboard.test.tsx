// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type {
  CardDef,
  CardInstance,
  PendingEffect,
  SupplyPile,
} from '../../types';
import { CardType } from '../../types';
import PendingEffectUI from '../PendingEffectUI';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {};
      if (className) props.className = className;
      if (onClick) props.onClick = onClick;
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

function def(
  name: string,
  cost: number,
  types: CardType[] = [CardType.Action],
): CardDef {
  return { name, nameJa: name, cost, types, effects: {} };
}

let seq = 0;
function card(
  name: string,
  types: CardType[] = [CardType.Treasure],
): CardInstance {
  seq += 1;
  return { instanceId: `kb-${name}-${seq}`, def: def(name, 0, types) };
}

function pending(
  type: PendingEffect['type'],
  data?: Record<string, unknown>,
): PendingEffect {
  return { type, sourceCard: def(type, 0), playerId: 'p1', data };
}

function pile(name: string, cost: number): SupplyPile {
  return { card: def(name, cost), count: 10 };
}

function renderUI(
  pendingEffect: PendingEffect,
  opts: { hand?: CardInstance[]; supply?: SupplyPile[] } = {},
) {
  const onResolve = vi.fn();
  const ui = (pe: PendingEffect) => (
    <>
      {/* 選択画面の後ろにある、押せないはずのボタン */}
      <button type="button">後ろのボタン</button>
      <PendingEffectUI
        pendingEffect={pe}
        hand={opts.hand ?? []}
        discard={[]}
        supply={opts.supply ?? []}
        onResolve={onResolve}
      />
    </>
  );
  const utils = render(ui(pendingEffect));
  return { onResolve, rerender: (pe: PendingEffect) => utils.rerender(ui(pe)) };
}

describe('効果の選択画面: キーボード', () => {
  it('開いたら最初のカードにフォーカスする（確定ボタンは選ぶまで押せないので）', () => {
    renderUI(pending('chapel'), { hand: [card('A'), card('B')] });
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('Space でカードを選び、Tab で確定ボタンへ進んで Enter で決める', async () => {
    const user = userEvent.setup();
    const a = card('A');
    const { onResolve } = renderUI(pending('chapel'), {
      hand: [a, card('B')],
    });
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: '1枚廃棄する' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onResolve).toHaveBeenCalledWith({ selectedCards: [a.instanceId] });
  });

  it('サプライから獲得するカードもキーボードで選べる（名前にコスト）', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(pending('workshop'), {
      supply: [pile('Village', 3), pile('Smithy', 4)],
    });
    expect(
      screen.getByRole('button', { name: 'Village（コスト 3）' }),
    ).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onResolve).toHaveBeenCalledWith({ selectedCardName: 'Smithy' });
  });

  it('Tab は選択画面の中で回り、後ろのボタンには行かない', async () => {
    const user = userEvent.setup();
    renderUI(pending('chapel'), { hand: [card('A'), card('B')] });
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
    }
    await user.tab({ shift: true });
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull();
  });

  it('Esc では閉じない（閉じると効果が消えるため）', async () => {
    const user = userEvent.setup();
    const { onResolve } = renderUI(pending('chapel'), {
      hand: [card('A')],
    });
    await user.keyboard('{Escape}');
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('選択待ちが新しくなったら（玉座の間の 2 回目など）、また最初のカードにフォーカスする', async () => {
    const user = userEvent.setup();
    const hand = [card('A'), card('B')];
    const { rerender } = renderUI(pending('chapel'), { hand });
    await user.keyboard(' ');
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: '1枚廃棄する' })).toHaveFocus();
    act(() => rerender(pending('chapel')));
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
  });

  it('家臣のようにカードを選ばない画面は、最初のボタンにフォーカスする', () => {
    const revealed = card('Workshop', [CardType.Action]);
    render(
      <PendingEffectUI
        pendingEffect={pending('vassal', {
          revealedCardId: revealed.instanceId,
        })}
        hand={[]}
        discard={[revealed]}
        supply={[]}
        onResolve={() => {}}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Workshopをプレイする' }),
    ).toHaveFocus();
  });
});
