// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCardInstance, getCardDef } from '../../domain/card';
import { useGameStore } from '../../stores/gameStore';
import type { PlayerState } from '../../types';
import ResultPage from '../ResultPage';

const kingdom = [
  'Cellar',
  'Chapel',
  'Village',
  'Workshop',
  'Smithy',
  'Remodel',
  'Militia',
  'Market',
  'Gardens',
  'Witch',
].map(getCardDef);

function withCards(
  player: PlayerState,
  cards: Record<string, number>,
): PlayerState {
  const deck = Object.entries(cards).flatMap(([name, n]) =>
    Array.from({ length: n }, () => createCardInstance(getCardDef(name))),
  );
  return { ...player, deck, hand: [], discard: [], playArea: [] };
}

/** 結果画面の場面。turnNumber は終了判定のあと（最後に遊んだ番 + 1） */
function setResult(opts: {
  you: Record<string, number>;
  ai: Record<string, number>;
  turnNumber: number;
  counts?: Record<string, number>;
}) {
  useGameStore.getState().startGame(kingdom, 'bigMoneySmithy');
  const gs = useGameStore.getState().gameState!;
  const counts = opts.counts ?? { Province: 0 };
  useGameStore.setState({
    page: 'result',
    gameState: {
      ...gs,
      players: [
        withCards(gs.players[0], opts.you),
        withCards(gs.players[1], opts.ai),
      ],
      supply: gs.supply.map((p) =>
        p.card.name in counts ? { ...p, count: counts[p.card.name] } : p,
      ),
      turnNumber: opts.turnNumber,
      gameOver: true,
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({
    page: 'title',
    gameState: null,
    lastBuy: null,
    aiTurn: null,
    lastSetup: null,
  });
});

describe('ResultPage: 勝ち負けと終わった理由', () => {
  it('勝ったら「あなたの勝ち！」と、終わった理由・ラウンド数を出す（「ターン数: 25」「VP」は出さない）', () => {
    setResult({
      you: { Province: 4, Duchy: 1, Estate: 3, Copper: 7 },
      ai: { Province: 4, Estate: 3, Copper: 7 },
      turnNumber: 25,
    });
    render(<ResultPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'あなたの勝ち！' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/属州の山がなくなりました/)).toBeInTheDocument();
    expect(screen.getByText(/12 ラウンド/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('VP');
    expect(document.body).not.toHaveTextContent('ターン数: 25');
  });

  it('負けたら「あなたの負け」', () => {
    setResult({
      you: { Province: 3, Estate: 3 },
      ai: { Province: 5, Estate: 3 },
      turnNumber: 25,
    });
    render(<ResultPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'あなたの負け' }),
    ).toBeInTheDocument();
  });

  it('同点でターン数も同じなら「引き分け」（1位・2位に分けない）', () => {
    setResult({
      you: { Province: 4, Estate: 3 },
      ai: { Province: 4, Estate: 3 },
      turnNumber: 25,
    });
    render(<ResultPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: '引き分け' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('勝利点もターン数も同じなので引き分けです'),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('2位');
  });

  it('同点で、あなたの番で終わったら、ターン数が少ない AI の勝ち（理由も書く）', () => {
    setResult({
      you: { Province: 4, Estate: 3 },
      ai: { Province: 4, Estate: 3 },
      turnNumber: 24,
    });
    render(<ResultPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'あなたの負け' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ターン数が少ないAIの勝ち/)).toBeInTheDocument();
  });

  it('山が 3 つ空で終わったら、空になった山も書く', () => {
    setResult({
      you: { Estate: 3 },
      ai: { Estate: 2 },
      turnNumber: 31,
      counts: { Estate: 0, Village: 0, Smithy: 0 },
    });
    render(<ResultPage />);
    expect(
      screen.getByText(/サプライの山が 3 つ空になりました（屋敷・村・鍛冶屋）/),
    ).toBeInTheDocument();
  });
});

describe('ResultPage: 勝利点の内訳', () => {
  it('両者の属州・公領・屋敷（と持っている庭園・呪い）の枚数と点、合計を表で出す', () => {
    setResult({
      you: { Province: 3, Gardens: 1, Copper: 16 },
      ai: { Province: 2, Curse: 2, Copper: 10 },
      turnNumber: 25,
    });
    render(<ResultPage />);
    const table = screen.getByRole('table', { name: '勝利点の内訳' });
    const row = (name: string) =>
      within(table)
        .getByRole('rowheader', { name })
        .closest('tr') as HTMLElement;
    expect(row('属州')).toHaveTextContent('3 枚18 点');
    expect(row('属州')).toHaveTextContent('2 枚12 点');
    expect(row('庭園')).toHaveTextContent('1 枚2 点');
    expect(row('呪い')).toHaveTextContent('2 枚-2 点');
    expect(row('合計')).toHaveTextContent('20 点');
    expect(row('合計')).toHaveTextContent('10 点');
  });
});

describe('ResultPage: 次に遊ぶ', () => {
  it('「同じキングダムでもう一度」で、同じキングダム・同じ AI の新しいゲームを始める', () => {
    setResult({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 });
    render(<ResultPage />);
    fireEvent.click(
      screen.getByRole('button', { name: '同じキングダムでもう一度' }),
    );
    const s = useGameStore.getState();
    expect(s.page).toBe('game');
    expect(s.gameState!.gameOver).toBe(false);
    expect(s.aiStrategy).toBe('bigMoneySmithy');
    expect(s.gameState!.supply.slice(7).map((p) => p.card.name)).toEqual(
      kingdom.map((c) => c.name),
    );
  });

  it('「キングダムを選び直す」でゲーム設定へ、「タイトルに戻る」でタイトルへ', () => {
    setResult({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 });
    const { unmount } = render(<ResultPage />);
    fireEvent.click(
      screen.getByRole('button', { name: 'キングダムを選び直す' }),
    );
    expect(useGameStore.getState().page).toBe('setup');
    unmount();

    setResult({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 });
    render(<ResultPage />);
    fireEvent.click(screen.getByRole('button', { name: 'タイトルに戻る' }));
    expect(useGameStore.getState().page).toBe('title');
  });

  it('使ったキングダムを見せる（「同じキングダム」が何か分かるように）', () => {
    setResult({ you: { Estate: 3 }, ai: { Estate: 3 }, turnNumber: 25 });
    render(<ResultPage />);
    expect(screen.getByText(/地下貯蔵庫・礼拝堂・村/)).toBeInTheDocument();
  });
});
