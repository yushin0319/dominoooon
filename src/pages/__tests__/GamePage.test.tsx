// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import {
  GAME_OVER_DELAY_MS,
  NOTICE_MS,
  TURN_START_NOTICE,
} from '../../lib/turnFlow';
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
  counts?: Record<string, number>;
}) {
  useGameStore.getState().startGame(kingdom, 'bigMoney');
  const gs = useGameStore.getState().gameState!;
  const mk = (names: string[]) =>
    names.map((n) => createCardInstance(getCardDef(n)));
  const counts = opts.counts ?? {};
  useGameStore.setState({
    gameState: {
      ...gs,
      players: [
        {
          ...gs.players[0],
          hand: mk(opts.hand),
          deck: mk(['Copper', 'Copper', 'Estate', 'Copper', 'Copper']),
          playArea: [],
        },
        gs.players[1],
      ],
      supply: gs.supply.map((p) =>
        p.card.name in counts ? { ...p, count: counts[p.card.name] } : p,
      ),
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

function handArea(): HTMLElement {
  const card = document.querySelector('[data-hand-card]');
  if (!card) throw new Error('no hand card');
  return card.parentElement as HTMLElement;
}

const human = () => useGameStore.getState().gameState!.players[0];

beforeEach(() => {
  useGameStore.setState({ page: 'game', gameState: null, lastBuy: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GamePage: カードを押したらすぐ使う・買う（確認画面なし）', () => {
  it('手札の使えるカードを押すと、すぐプレイする', () => {
    setScene({ hand: ['Village', 'Smithy', 'Copper'], phase: Phase.Action });
    render(<GamePage />);

    fireEvent.click(within(handArea()).getByText('村'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(human().playArea.map((c) => c.def.name)).toEqual(['Village']);
  });

  it('サプライの買えるカードを押すと、すぐ買う。「購入を取り消す」で戻せる', () => {
    setScene({ hand: [], phase: Phase.Buy, coins: 3 });
    render(<GamePage />);

    fireEvent.click(screen.getByText('銀貨'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(human().discard.map((c) => c.def.name)).toEqual(['Silver']);

    fireEvent.click(
      screen.getByRole('button', { name: '銀貨の購入を取り消す' }),
    );
    expect(human().discard).toEqual([]);
    expect(useGameStore.getState().gameState!.turnState.coins).toBe(3);
    expect(screen.queryByText('購入を取り消す')).toBeNull();
  });
});

describe('GamePage: ターンを進めるボタンと確認', () => {
  it('アクションが残っているのに「購入へ進む」を押すと確認を出す', () => {
    setScene({ hand: ['Workshop', 'Copper'], phase: Phase.Action });
    render(<GamePage />);

    fireEvent.click(screen.getByRole('button', { name: '購入へ進む' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('アクションカードがまだ使えます');

    fireEvent.click(within(dialog).getByRole('button', { name: 'やめる' }));
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Action);

    fireEvent.click(screen.getByRole('button', { name: '購入へ進む' }));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: '購入へ進む',
      }),
    );
    expect(useGameStore.getState().gameState!.phase).toBe(Phase.Buy);
  });

  it('買えるカードがあるのに「ターン終了」を押すと確認を出す', () => {
    setScene({ hand: [], phase: Phase.Buy, coins: 3, buys: 1 });
    render(<GamePage />);

    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('残り 3 コイン・購入 1 回');
    fireEvent.click(within(dialog).getByRole('button', { name: 'ターン終了' }));
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);
  });

  it('買えるものが残っていなければ、確認なしでターンを終える', () => {
    setScene({ hand: [], phase: Phase.Buy, coins: 3, buys: 0 });
    render(<GamePage />);

    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);
  });
});

describe('GamePage: お知らせとゲーム終了', () => {
  it('自分の番の始まりに「あなたのターン」を出し、少しで消す', () => {
    vi.useFakeTimers();
    setScene({ hand: [], phase: Phase.Buy, coins: 0 });
    render(<GamePage />);

    expect(screen.getByText(TURN_START_NOTICE)).toBeVisible();
    act(() => {
      vi.advanceTimersByTime(NOTICE_MS);
    });
    expect(screen.queryByText(TURN_START_NOTICE)).toBeNull();
  });

  it('ゲームが終わったら理由を見せ、少し待ってから結果画面へ', () => {
    vi.useFakeTimers();
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      counts: { Province: 0 },
    });
    render(<GamePage />);
    // 終了条件を満たしたことを予告する
    expect(screen.getByTestId('game-end-status').dataset.level).toBe('end');

    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(useGameStore.getState().gameState!.gameOver).toBe(true);
    expect(
      screen.getByRole('status', { name: 'ゲーム終了' }),
    ).toHaveTextContent('属州の山がなくなりました');
    expect(useGameStore.getState().page).toBe('game');

    act(() => {
      vi.advanceTimersByTime(GAME_OVER_DELAY_MS);
    });
    expect(useGameStore.getState().page).toBe('result');
  });
});
