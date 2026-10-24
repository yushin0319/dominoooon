// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import type { PlayerState } from '../../types';
import PlayerStatus, {
  PlayerStatusButton,
  PlayerStatusDialog,
} from '../PlayerStatus';

const mk = (names: string[]) =>
  names.map((n) => createCardInstance(getCardDef(n)));

function makePlayers(): PlayerState[] {
  return [
    {
      id: '0',
      name: 'あなた',
      deck: mk(['Copper', 'Copper', 'Estate', 'Copper', 'Copper']),
      hand: mk(['Copper', 'Estate']),
      discard: mk(['Silver', 'Copper', 'Estate']),
      playArea: [],
    },
    {
      id: '1',
      name: 'AI',
      deck: mk(['Copper', 'Copper']),
      hand: mk(['Copper', 'Copper', 'Estate', 'Copper', 'Copper']),
      discard: mk([
        'Copper',
        'Province',
        'Copper',
        'Estate',
        'Silver',
        'Copper',
        'Gold',
        'Estate',
      ]),
      playArea: [],
    },
  ];
}

/** その人の行（名前の入った行） */
function row(name: string): HTMLElement {
  const el = screen.getByRole('rowheader', { name }).closest('tr');
  if (!el) throw new Error(`no row for ${name}`);
  return el as HTMLElement;
}

const cell = (name: string, column: string) =>
  within(row(name)).getByTestId(`status-${column}`);

describe('PlayerStatus: 両者の山札・捨て札・勝利点', () => {
  it('自分と AI の山札の枚数・捨て札の枚数・勝利点を出す', () => {
    render(<PlayerStatus players={makePlayers()} />);

    expect(cell('あなた', 'deck')).toHaveTextContent('5');
    expect(cell('あなた', 'discard')).toHaveTextContent('3');
    // 屋敷 3 枚（山札・手札・捨て札）
    expect(cell('あなた', 'vp')).toHaveTextContent('3');

    expect(cell('AI', 'deck')).toHaveTextContent('2');
    expect(cell('AI', 'discard')).toHaveTextContent('8');
    // 属州 6 + 屋敷 3 枚
    expect(cell('AI', 'vp')).toHaveTextContent('9');
  });

  it('勝っている方の勝利点に印を付ける（同点なら付けない）', () => {
    const { rerender } = render(<PlayerStatus players={makePlayers()} />);
    expect(cell('AI', 'vp').dataset.leading).toBe('true');
    expect(cell('あなた', 'vp').dataset.leading).toBeUndefined();

    const tie = makePlayers();
    // AI も 3 点（手札の屋敷 1 + 捨て札の屋敷 2）
    tie[1] = { ...tie[1], discard: mk(['Estate', 'Estate']) };
    rerender(<PlayerStatus players={tie} />);
    expect(cell('AI', 'vp').dataset.leading).toBeUndefined();
    expect(cell('あなた', 'vp').dataset.leading).toBeUndefined();
  });

  it('捨て札の枚数を押すと中身の一覧を出し、もう一度押すと閉じる', () => {
    render(<PlayerStatus players={makePlayers()} />);
    const button = screen.getByRole('button', {
      name: 'AIの捨て札 8 枚を見る',
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('list', { name: 'AIの捨て札（8 枚）' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['金貨×1', '銀貨×1', '銅貨×3', '属州×1', '屋敷×2']);

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('もう一人の捨て札を押すと、そちらの一覧に切り替える', () => {
    render(<PlayerStatus players={makePlayers()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'AIの捨て札 8 枚を見る' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'あなたの捨て札 3 枚を見る' }),
    );
    expect(screen.queryByRole('list', { name: /AIの捨て札/ })).toBeNull();
    expect(
      screen.getByRole('list', { name: 'あなたの捨て札（3 枚）' }),
    ).toBeVisible();
  });

  it('捨て札が 0 枚なら押すボタンは出さない', () => {
    const players = makePlayers();
    players[0] = { ...players[0], discard: [] };
    render(<PlayerStatus players={players} />);
    expect(cell('あなた', 'discard')).toHaveTextContent('0');
    expect(screen.queryByRole('button', { name: /あなたの捨て札/ })).toBeNull();
  });

  it('捨て札のボタンは押しやすい高さ（44px 以上）', () => {
    render(<PlayerStatus players={makePlayers()} />);
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toMatch(/\bmin-h-11\b/);
    }
  });

  it('一覧を開いたあとで捨て札が空になったら、一覧を閉じる', () => {
    const players = makePlayers();
    const { rerender } = render(<PlayerStatus players={players} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'AIの捨て札 8 枚を見る' }),
    );

    const shuffled = makePlayers();
    shuffled[1] = { ...shuffled[1], discard: [] };
    rerender(<PlayerStatus players={shuffled} />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('PlayerStatusButton / PlayerStatusDialog: 狭い画面ではボタンから開く', () => {
  it('ボタンに両者の勝利点を出し、押すと開く', () => {
    const onOpen = vi.fn();
    render(<PlayerStatusButton players={makePlayers()} onOpen={onOpen} />);
    const button = screen.getByRole('button', { name: /あなた 3点.*AI 9点/ });
    expect(button).toHaveAccessibleName(/山札・捨て札を見る/);
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('開いた画面に山札・捨て札・勝利点を出し、「閉じる」と Esc で閉じる', () => {
    const onClose = vi.fn();
    render(<PlayerStatusDialog players={makePlayers()} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: '山札・捨て札・勝利点' });
    expect(
      within(dialog).getByRole('button', { name: '閉じる' }),
    ).toHaveFocus();
    expect(cell('AI', 'discard')).toHaveTextContent('8');

    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
