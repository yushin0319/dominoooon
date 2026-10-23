// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import { getHandCardOverlap } from '../../lib/handLayout';
import type { CardInstance } from '../../types';
import Hand from '../Hand';

// framer-motion をモック（jsdomで動かないため）。レイアウト確認に必要な style は通す
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }: Record<string, unknown>) => (
      <div
        className={className as string | undefined}
        style={style as React.CSSProperties | undefined}
        data-testid={
          (style as React.CSSProperties | undefined)?.marginLeft !== undefined
            ? 'hand-card'
            : undefined
        }
      >
        {children as React.ReactNode}
      </div>
    ),
  },
}));

function makeHand(count: number): CardInstance[] {
  const copper = getCardDef('Copper');
  return Array.from({ length: count }, (_, i) => ({
    instanceId: `c${i}`,
    def: copper,
  }));
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function marginsOf(cards: HTMLElement[]): string[] {
  return cards.map((el) => el.style.marginLeft);
}

describe('Hand のカードの重なり', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => setViewportWidth(originalWidth));

  it('PC 幅（1366px）では従来どおり 2 枚目以降を 16px 重ねる', () => {
    setViewportWidth(1366);
    const { getAllByTestId } = render(<Hand hand={makeHand(5)} />);
    expect(marginsOf(getAllByTestId('hand-card'))).toEqual([
      '0px',
      '-16px',
      '-16px',
      '-16px',
      '-16px',
    ]);
  });

  it('スマホ幅（390px）では画面幅に収まる重なりにする', () => {
    setViewportWidth(390);
    const { getAllByTestId } = render(<Hand hand={makeHand(5)} />);
    const overlap = getHandCardOverlap(5, 390);
    expect(overlap).toBeGreaterThan(16);
    expect(marginsOf(getAllByTestId('hand-card'))).toEqual([
      '0px',
      `-${overlap}px`,
      `-${overlap}px`,
      `-${overlap}px`,
      `-${overlap}px`,
    ]);
  });

  it('画面幅が変わったら（resize）重なりを計算し直す', () => {
    setViewportWidth(1366);
    const { getAllByTestId } = render(<Hand hand={makeHand(5)} />);
    expect(getAllByTestId('hand-card')[1].style.marginLeft).toBe('-16px');

    act(() => {
      setViewportWidth(390);
      window.dispatchEvent(new Event('resize'));
    });
    expect(getAllByTestId('hand-card')[1].style.marginLeft).toBe(
      `-${getHandCardOverlap(5, 390)}px`,
    );
  });
});
