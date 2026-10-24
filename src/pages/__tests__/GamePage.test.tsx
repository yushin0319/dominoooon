// @vitest-environment jsdom

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import {
  GAME_OVER_DELAY_MS,
  getAIStepMs,
  getAITurnStartMs,
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
  /** AI の戦略・手札・山札（AI の番を見るとき） */
  ai?: 'bigMoney' | 'bigMoneySmithy';
  aiHand?: string[];
  aiDeck?: string[];
}) {
  useGameStore.getState().startGame(kingdom, opts.ai ?? 'bigMoney');
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
        opts.aiHand
          ? {
              ...gs.players[1],
              hand: mk(opts.aiHand),
              deck: mk(
                opts.aiDeck ?? [
                  'Copper',
                  'Copper',
                  'Copper',
                  'Estate',
                  'Estate',
                ],
              ),
            }
          : gs.players[1],
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
  useGameStore.setState({
    page: 'game',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
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

/** 帯の一言・お知らせ（読み上げの対象） */
function liveRegion(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[aria-live]');
  if (!el) throw new Error('no live region');
  return el;
}

function playArea(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-play-area]');
  if (!el) throw new Error('no play area');
  return el;
}

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

/** 人間の番に戻るまで 100ms ずつ進め、かかった時間を返す（上限 10 秒） */
function waitForHumanTurn(): number {
  let elapsed = 0;
  while (
    useGameStore.getState().gameState!.currentPlayerIndex !== 0 &&
    elapsed < 10000
  ) {
    advance(100);
    elapsed += 100;
  }
  return elapsed;
}

/** 自分の番を何もせずに終えて、AI の番にする（「あなたのターン」のお知らせが消えてから） */
function endHumanTurn() {
  advance(NOTICE_MS);
  fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
  expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);
}

describe('GamePage: AI のターンを段階ごとに見せる', () => {
  it('考え中 → 財宝を場に出す → 購入 → 自分の番、と順に見せ、まとめの 1 行をログに残す', () => {
    vi.useFakeTimers();
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      aiHand: ['Copper', 'Copper', 'Copper', 'Silver', 'Estate'],
    });
    render(<GamePage />);
    endHumanTurn();

    expect(liveRegion()).toHaveTextContent('AIが考えています...');
    expect(
      screen.getByRole('button', { name: 'AIのターンをスキップ' }),
    ).toBeVisible();

    // 財宝を場に出す（AI の場に並ぶ。まだ買っていない）
    advance(getAITurnStartMs(false));
    expect(liveRegion()).toHaveTextContent(
      'AIが財宝を出しました: 銅貨×3・銀貨 → 5 コイン',
    );
    expect(within(playArea()).getByText('AIの場')).toBeVisible();
    expect(within(playArea()).getAllByText('銅貨')).toHaveLength(3);
    expect(within(playArea()).getByText('銀貨')).toBeVisible();

    // 購入
    advance(getAIStepMs('treasure', false));
    expect(liveRegion()).toHaveTextContent('AIが銀貨を購入');
    expect(screen.getByText('AI: 5 コイン → 銀貨を購入')).toBeVisible();
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(1);

    // 自分の番
    advance(getAIStepMs('buy', false));
    expect(useGameStore.getState().gameState!.currentPlayerIndex).toBe(0);
    expect(screen.getByText(TURN_START_NOTICE)).toBeVisible();
    expect(screen.queryByText('AIの場')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'AIのターンをスキップ' }),
    ).toBeNull();
  });

  it('何も買わなかったターンも、まとめの 1 行をログに残す', () => {
    vi.useFakeTimers();
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      aiHand: ['Copper', 'Copper', 'Estate', 'Estate', 'Estate'],
    });
    render(<GamePage />);
    endHumanTurn();
    waitForHumanTurn();

    expect(screen.getByText('AI: 2 コイン → 購入なし')).toBeVisible();
  });

  it('アクションを使うターンも 3 秒以内に自分の番になる（使ったアクションの段階も見せる）', () => {
    vi.useFakeTimers();
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      ai: 'bigMoneySmithy',
      aiHand: ['Smithy', 'Copper', 'Copper', 'Copper', 'Estate'],
      aiDeck: ['Silver', 'Copper', 'Gold', 'Estate', 'Copper'],
    });
    render(<GamePage />);
    endHumanTurn();

    advance(getAITurnStartMs(false));
    expect(liveRegion()).toHaveTextContent('AIが鍛冶屋をプレイ（+3 ドロー）');
    expect(within(playArea()).getByText('鍛冶屋')).toBeVisible();

    const elapsed = getAITurnStartMs(false) + waitForHumanTurn();
    expect(elapsed).toBeLessThanOrEqual(3000);
    expect(screen.getByText('AI: 9 コイン → 属州を購入')).toBeVisible();
  });

  it('「スキップ」を押すと、すぐ自分の番になる（そのあと勝手に進まない）', () => {
    vi.useFakeTimers();
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      aiHand: ['Copper', 'Copper', 'Copper', 'Silver', 'Estate'],
    });
    render(<GamePage />);
    endHumanTurn();
    advance(getAITurnStartMs(false));

    fireEvent.click(
      screen.getByRole('button', { name: 'AIのターンをスキップ' }),
    );
    const gs = useGameStore.getState().gameState!;
    expect(gs.currentPlayerIndex).toBe(0);
    // ターンを終えたので、場の財宝・手札・買った銀貨がすべて捨て札にある
    expect(gs.players[1].discard.map((c) => c.def.name).sort()).toEqual([
      'Copper',
      'Copper',
      'Copper',
      'Estate',
      'Silver',
      'Silver',
    ]);
    expect(screen.getByText('AI: 5 コイン → 銀貨を購入')).toBeVisible();

    advance(3000);
    expect(useGameStore.getState().gameState).toBe(gs);
  });

  it('動きを減らす設定（prefers-reduced-motion）では、1 秒ほどで自分の番になる', () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    setScene({
      hand: [],
      phase: Phase.Buy,
      buys: 0,
      aiHand: ['Copper', 'Copper', 'Copper', 'Silver', 'Estate'],
    });
    render(<GamePage />);
    endHumanTurn();

    expect(waitForHumanTurn()).toBeLessThanOrEqual(1000);
    expect(screen.getByText('AI: 5 コイン → 銀貨を購入')).toBeVisible();
  });
});

describe('GamePage: 山札・捨て札・勝利点', () => {
  /** PC で常に見える欄（画面幅の切り替えは CSS なので、jsdom では両方ある） */
  function panelCell(name: string, column: string): HTMLElement {
    const panel = screen.getByTestId('player-status-panel');
    const row = within(panel).getByRole('rowheader', { name }).closest('tr');
    if (!row) throw new Error(`no row for ${name}`);
    return within(row as HTMLElement).getByTestId(`status-${column}`);
  }

  it('両者の山札・捨て札・勝利点を出し、買ったら捨て札と勝利点が増える', () => {
    setScene({ hand: [], phase: Phase.Buy, coins: 2 });
    render(<GamePage />);
    expect(panelCell('あなた', 'deck')).toHaveTextContent('5');
    expect(panelCell('あなた', 'discard')).toHaveTextContent('0');
    // 自分は山札の屋敷 1 枚で 1 点（場面で差し替えた）、AI は最初の屋敷 3 枚で 3 点
    expect(panelCell('あなた', 'vp')).toHaveTextContent('1');
    expect(panelCell('AI', 'vp')).toHaveTextContent('3');

    fireEvent.click(screen.getByText('屋敷'));
    expect(panelCell('あなた', 'discard')).toHaveTextContent('1');
    expect(panelCell('あなた', 'vp')).toHaveTextContent('2');
  });

  it('狭い画面用: ゲームログの見出しのボタンから開き、Esc で閉じる', () => {
    setScene({ hand: [], phase: Phase.Buy, coins: 0 });
    render(<GamePage />);
    fireEvent.click(screen.getByRole('button', { name: /山札・捨て札を見る/ }));
    const dialog = screen.getByRole('dialog', { name: '山札・捨て札・勝利点' });
    expect(within(dialog).getByRole('rowheader', { name: 'AI' })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
