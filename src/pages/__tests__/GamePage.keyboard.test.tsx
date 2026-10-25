// @vitest-environment jsdom

import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import { useGameStore } from '../../stores/gameStore';
import { Phase } from '../../types';
import GamePage from '../GamePage';

// framer-motion をモック（jsdom で動かないため）。data-* と onClick だけ通す
vi.mock('framer-motion', () => {
  const div = ({
    children,
    className,
    style,
    onClick,
    ...rest
  }: Record<string, unknown>) => {
    const props: Record<string, unknown> = {
      className,
      style,
      onClick,
      ...Object.fromEntries(
        Object.entries(rest).filter(([k]) => k.startsWith('data-')),
      ),
    };
    return <div {...props}>{children as ReactNode}</div>;
  };
  return {
    motion: { div },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

const kingdom = [
  'Cellar',
  'Chapel',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Mine',
  'Witch',
].map(getCardDef);

/** 人間（0 番）の番の場面を作る（ストアを直接書き換えるので自動進行はしない） */
function setScene(opts: {
  hand: string[];
  phase: Phase;
  actions?: number;
  buys?: number;
  coins?: number;
  deck?: string[];
}) {
  useGameStore.getState().startGame(kingdom, 'bigMoney');
  const gs = useGameStore.getState().gameState!;
  const mk = (names: string[]) =>
    names.map((n) => createCardInstance(getCardDef(n)));
  useGameStore.setState({
    gameState: {
      ...gs,
      players: [
        {
          ...gs.players[0],
          hand: mk(opts.hand),
          deck: mk(opts.deck ?? ['Copper', 'Copper', 'Estate', 'Copper']),
          playArea: [],
        },
        gs.players[1],
      ],
      phase: opts.phase,
      turnState: {
        actions: opts.actions ?? 1,
        buys: opts.buys ?? 1,
        coins: opts.coins ?? 0,
      },
    },
    lastBuy: null,
  });
}

const human = () => useGameStore.getState().gameState!.players[0];
const played = () => human().playArea.map((c) => c.def.name);

/** フォーカスが行き場をなくしたときの移し先を決めるのを待つ（setTimeout で後回しにしている） */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

/** Tab を押して、条件に合う要素にフォーカスが来るまで進める（上限 40 回） */
async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  match: (el: Element) => boolean,
) {
  for (let i = 0; i < 40; i++) {
    await user.tab();
    if (document.activeElement && match(document.activeElement)) return;
  }
  throw new Error('focus did not reach the target');
}

const labelIs = (name: string) => (el: Element) =>
  el.getAttribute('aria-label') === name || el.textContent === name;

beforeEach(() => {
  useGameStore.setState({
    page: 'game',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GamePage: キーボードで手札を使う', () => {
  it('Tab で手札の使えるカードへ移り、Enter でプレイする', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper', 'Village', 'Estate'], phase: Phase.Action });
    render(<GamePage />);
    await tabTo(user, labelIs('村をプレイ'));
    await user.keyboard('{Enter}');
    expect(played()[0]).toBe('Village');
  });

  it('数字キー 1〜9 で手札の左から N 枚目をプレイする（使えないカードの数字では何もしない）', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper', 'Village', 'Smithy'], phase: Phase.Action });
    render(<GamePage />);
    await user.keyboard('1');
    expect(played()).toEqual([]);
    await user.keyboard('2');
    expect(played()).toEqual(['Village']);
  });

  it('メニューなどのダイアログを開いている間は、数字キーで手札を使わない', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Village', 'Smithy'], phase: Phase.Action });
    render(<GamePage />);
    await user.click(screen.getAllByRole('button', { name: 'メニュー' })[0]);
    await user.keyboard('1');
    expect(played()).toEqual([]);
  });

  it('使ったカードが手札から消えたら、次に押す所（買えるカード）へフォーカスを移す', async () => {
    const user = userEvent.setup();
    // 村を使うと使えるアクションが残らないので、自動で購入フェーズへ進む
    setScene({
      hand: ['Village', 'Copper', 'Copper'],
      phase: Phase.Action,
      deck: ['Copper'],
    });
    render(<GamePage />);
    await tabTo(user, labelIs('村をプレイ'));
    await user.keyboard('{Enter}');
    await settle();
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(
      /を購入（/,
    );
  });

  it('マウスで使ったときはフォーカスを動かさない（見た目と操作感はそのまま）', async () => {
    const user = userEvent.setup();
    setScene({
      hand: ['Village', 'Copper', 'Copper'],
      phase: Phase.Action,
      deck: ['Copper'],
    });
    render(<GamePage />);
    await user.click(screen.getByRole('button', { name: '村をプレイ' }));
    await settle();
    expect(played()).toContain('Village');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('GamePage: キーボードでターンを進める', () => {
  it('「購入へ進む」を押したら、同じ場所に出る「ターン終了」ではなく買えるカードへ移る（Enter の 2 度押しでターンを終えない）', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper', 'Copper', 'Estate'], phase: Phase.Action });
    render(<GamePage />);
    await tabTo(user, labelIs('購入へ進む'));
    await user.keyboard('{Enter}');
    await settle();
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);
    expect(document.activeElement?.textContent).not.toBe('ターン終了');
    expect(document.activeElement?.getAttribute('aria-label')).toMatch(
      /を購入（/,
    );
  });

  it('買ったあとで買えるカードが無くなったら「ターン終了」へ移す', async () => {
    const user = userEvent.setup();
    setScene({ hand: [], phase: Phase.Buy, coins: 2, buys: 1 });
    render(<GamePage />);
    await tabTo(user, labelIs('屋敷を購入（コスト 2・残り 8 枚）'));
    await user.keyboard('{Enter}');
    await settle();
    expect(human().discard.map((c) => c.def.name)).toEqual(['Estate']);
    expect(document.activeElement?.textContent).toBe('ターン終了');
  });

  it('ターン終了の確認は「やめる」にフォーカスし、Esc で閉じたら「ターン終了」へ戻す', async () => {
    const user = userEvent.setup();
    setScene({ hand: [], phase: Phase.Buy, coins: 3, buys: 1 });
    render(<GamePage />);
    await tabTo(user, labelIs('ターン終了'));
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', {
      name: 'まだ買えるカードがあります',
    });
    expect(
      within(dialog).getByRole('button', { name: 'やめる' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'ターン終了' })).toHaveFocus();
  });

  it('ゲームをやめる確認は「続ける」にフォーカスする', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper'], phase: Phase.Buy, coins: 1 });
    render(<GamePage />);
    await user.click(screen.getAllByRole('button', { name: 'メニュー' })[0]);
    await user.click(screen.getByRole('button', { name: 'ゲームをやめる' }));
    expect(screen.getByRole('button', { name: '続ける' })).toHaveFocus();
  });
});

describe('GamePage: 遊び方にキーボードの操作を載せる', () => {
  it('Tab・Enter / Space・数字キー・Esc の使い方を書く', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper'], phase: Phase.Buy, coins: 1 });
    render(<GamePage />);
    await user.click(screen.getAllByRole('button', { name: '遊び方' })[0]);
    const dialog = screen.getByRole('dialog', { name: '遊び方' });
    const section = within(dialog)
      .getByRole('heading', { name: /キーボード/ })
      .closest('section') as HTMLElement;
    for (const key of ['Tab', 'Enter', '1〜9', 'Esc']) {
      expect(section).toHaveTextContent(key);
    }
  });
});

describe('GamePage: ダイアログを閉じたらフォーカスを戻す', () => {
  it('遊び方: 開いたボタンへ戻す', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper'], phase: Phase.Buy, coins: 1 });
    render(<GamePage />);
    const help = screen.getAllByRole('button', { name: '遊び方' })[0];
    await tabTo(user, (el) => el === help);
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: '遊び方' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(help).toHaveFocus();
  });

  it('ゲームログ（狭い画面）: ダイアログの名前・閉じるにフォーカス・Esc で戻す', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper'], phase: Phase.Buy, coins: 1 });
    render(<GamePage />);
    const open = screen.getByRole('button', { name: 'ゲームログを全部見る' });
    await tabTo(user, (el) => el === open);
    await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: 'ゲームログ' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(
      within(dialog).getByRole('button', { name: '閉じる' }),
    ).toHaveFocus();
    // 一覧の欄も Tab で選べる（選んで矢印キーでスクロールできる）
    await user.tab();
    expect(
      within(dialog).getByRole('region', { name: 'ゲームログの一覧' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(open).toHaveFocus();
  });

  it('山札・捨て札・勝利点（狭い画面）: ダイアログの名前・Esc で戻す', async () => {
    const user = userEvent.setup();
    setScene({ hand: ['Copper'], phase: Phase.Buy, coins: 1 });
    render(<GamePage />);
    const open = screen.getByRole('button', { name: /山札・捨て札を見る/ });
    await tabTo(user, (el) => el === open);
    await user.keyboard('{Enter}');
    expect(
      screen.getByRole('dialog', { name: '山札・捨て札・勝利点' }),
    ).toHaveAttribute('aria-modal', 'true');
    await user.keyboard('{Escape}');
    expect(open).toHaveFocus();
  });
});

describe('GamePage: AI のターンのあと', () => {
  it('キーボードでターンを終えたら、自分の番が始まったときに次に押す所へフォーカスを移す', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    setScene({ hand: [], phase: Phase.Buy, buys: 0 });
    render(<GamePage />);
    await tabTo(user, labelIs('ターン終了'));
    await user.keyboard('{Enter}');
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);
    // AI のターンが終わるまで進める
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      if (useGameStore.getState().gameState!.currentPlayerIndex === 0) break;
    }
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(0);
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    const active = document.activeElement as HTMLElement;
    expect(active).not.toBe(document.body);
    expect(
      active.closest('[data-hand-card], [data-supply]') !== null ||
        active.hasAttribute('data-turn-primary'),
    ).toBe(true);
  });
});
