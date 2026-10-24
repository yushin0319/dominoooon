// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import TitlePage from '../TitlePage';

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({ page: 'title', gameState: null });
});

describe('TitlePage: 遊び方', () => {
  it('「遊び方」で 3 つのステップ・勝ち方・操作を見せ、「閉じる」で閉じる', () => {
    render(<TitlePage />);
    fireEvent.click(screen.getByRole('button', { name: '遊び方' }));
    const dialog = screen.getByRole('dialog', { name: '遊び方' });
    expect(
      within(dialog).getByRole('heading', { name: /アクション/ }),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent('同点なら');
    expect(dialog).toHaveTextContent('購入を取り消す');

    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('「ゲーム開始」でゲーム設定へ', () => {
    render(<TitlePage />);
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム開始' }));
    expect(useGameStore.getState().page).toBe('setup');
  });
});
