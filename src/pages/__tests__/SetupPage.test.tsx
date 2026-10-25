// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../stores/gameStore';
import SetupPage from '../SetupPage';

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({
    page: 'setup',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
  });
});

/** キングダムのカードのボタン（押すと選ぶ・外す） */
function cardButtons(): HTMLButtonElement[] {
  return screen
    .getAllByRole('button')
    .filter((b) => b.hasAttribute('aria-pressed')) as HTMLButtonElement[];
}

const selected = () =>
  cardButtons().filter((b) => b.getAttribute('aria-pressed') === 'true');

describe('SetupPage: カードの効果が読める', () => {
  it('どのカードにも名前とコストと効果の文を出す（名前だけだった）', () => {
    render(<SetupPage />);
    expect(cardButtons()).toHaveLength(26);
    const village = cardButtons().find((b) => b.textContent?.includes('村'));
    expect(village).toHaveTextContent('+1 ドロー、+2 アクション');
    const gardens = cardButtons().find((b) => b.textContent?.includes('庭園'));
    expect(gardens).toHaveTextContent('自分のカード10枚につき1勝利点');
  });

  it('どのカードにもそのカードの絵を出す（飾りなので読み上げでは読まない）', () => {
    render(<SetupPage />);
    const throneRoom = cardButtons().find((b) =>
      b.textContent?.includes('玉座の間'),
    ) as HTMLElement;
    const img = throneRoom.querySelector('img');
    expect(img?.getAttribute('src')).toMatch(/cards\/throne_room\.webp$/);
    expect(img).toHaveAttribute('alt', '');
    for (const b of cardButtons()) {
      expect(b.querySelector('img')).not.toBeNull();
    }
  });

  it('選んでいないカードも半透明にしない（不透明度 40% で読みにくかった）', () => {
    render(<SetupPage />);
    for (const b of cardButtons()) {
      expect(b.className).not.toMatch(/opacity-40/);
    }
  });
});

describe('SetupPage: 10 枚の上限', () => {
  it('最初はランダムに 10 枚選んである', () => {
    render(<SetupPage />);
    expect(selected()).toHaveLength(10);
  });

  it('10 枚選んだあとに別のカードを押すと「外してから選んで」と知らせ、選びは変えない', () => {
    render(<SetupPage />);
    const unselected = cardButtons().find(
      (b) => b.getAttribute('aria-pressed') === 'false',
    )!;
    fireEvent.click(unselected);
    expect(selected()).toHaveLength(10);
    expect(unselected).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(/外して/);
  });

  it('1 枚外せば、別のカードを選べる。9 枚以下では対戦開始は押せない', () => {
    render(<SetupPage />);
    fireEvent.click(selected()[0]);
    expect(selected()).toHaveLength(9);
    expect(screen.getByRole('button', { name: '対戦開始' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('あと 1 枚');

    const unselected = cardButtons().find(
      (b) => b.getAttribute('aria-pressed') === 'false',
    )!;
    fireEvent.click(unselected);
    expect(selected()).toHaveLength(10);
    expect(screen.getByRole('button', { name: '対戦開始' })).toBeEnabled();
  });
});

describe('SetupPage: AI の戦略', () => {
  it('戦略は日本語の名前と説明で選ぶ（英語の「Big Money」は出さない）', () => {
    render(<SetupPage />);
    const group = screen.getByRole('radiogroup', { name: 'AI の戦略' });
    expect(
      within(group).getByRole('radio', { name: /お金重視＋鍛冶屋/ }),
    ).not.toBeChecked();
    expect(
      within(group).getByRole('radio', { name: /^お金重視(?!＋)/ }),
    ).toBeChecked();
    expect(document.body).not.toHaveTextContent('Big Money');
    expect(group).toHaveTextContent('財宝と属州だけを買う');
  });

  it('選んだ戦略とキングダムで対戦を始める', () => {
    render(<SetupPage />);
    fireEvent.click(screen.getByRole('radio', { name: /お金重視＋鍛冶屋/ }));
    const names = selected().map((b) => b.dataset.card);
    fireEvent.click(screen.getByRole('button', { name: '対戦開始' }));
    const s = useGameStore.getState();
    expect(s.page).toBe('game');
    expect(s.aiStrategy).toBe('bigMoneySmithy');
    expect(
      s
        .gameState!.supply.slice(7)
        .map((p) => p.card.name)
        .sort(),
    ).toEqual([...names].sort());
  });

  it('「戻る」でタイトルへ', () => {
    render(<SetupPage />);
    fireEvent.click(screen.getByRole('button', { name: '戻る' }));
    expect(useGameStore.getState().page).toBe('title');
  });
});
