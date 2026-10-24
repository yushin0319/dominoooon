// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GameEndStatus } from '../../lib/gameEnd';
import { Phase } from '../../types';
import TurnInfo from '../TurnInfo';

function renderInfo(endStatus: GameEndStatus) {
  render(
    <TurnInfo
      turnState={{ actions: 1, buys: 1, coins: 0 }}
      phase={Phase.Action}
      turnNumber={3}
      currentPlayer="あなた"
      endStatus={endStatus}
    />,
  );
  return screen.getByTestId('game-end-status');
}

describe('TurnInfo: ゲーム終了の近さ', () => {
  it('属州の残りと空の山の数（3 つで終了）を出す', () => {
    const el = renderInfo({
      provincesLeft: 8,
      emptyPiles: 1,
      level: 'normal',
      reason: null,
    });
    expect(el).toHaveTextContent('属州');
    expect(el).toHaveTextContent('8');
    expect(el).toHaveTextContent('空の山 1/3');
    expect(el.dataset.level).toBe('normal');
  });

  it('終了が近い（属州 2 以下・空の山 2 以上）ときは警告の見た目にする', () => {
    const el = renderInfo({
      provincesLeft: 2,
      emptyPiles: 0,
      level: 'near',
      reason: null,
    });
    expect(el.dataset.level).toBe('near');
    expect(el).toHaveTextContent('まもなく終了');
  });

  it('終了条件を満たしたら、このターンで終わると出す', () => {
    const el = renderInfo({
      provincesLeft: 0,
      emptyPiles: 1,
      level: 'end',
      reason: 'province',
    });
    expect(el.dataset.level).toBe('end');
    expect(el).toHaveTextContent('このターンで終了');
  });
});
