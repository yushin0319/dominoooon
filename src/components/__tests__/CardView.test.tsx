// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import CardView from '../CardView';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: Record<string, unknown>) => (
      <div className={className as string | undefined}>
        {children as React.ReactNode}
      </div>
    ),
  },
}));

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

// jsdom はレイアウトしないので、ツールチップの位置（getBoundingClientRect）を差し替える
function mockTooltipRect(left: number, width = 256) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left,
    right: left + width,
    top: 0,
    bottom: 120,
    width,
    height: 120,
    x: left,
    y: 0,
    toJSON: () => ({}),
  });
}

function renderCopper() {
  render(<CardView card={getCardDef('Copper')} />);
  const tooltip = screen.getByRole('tooltip', { hidden: true });
  // 矢印はツールチップの最後の子要素
  const arrow = tooltip.lastElementChild as HTMLElement;
  // ツールチップと本体を包む外側の div（onMouseEnter を持つ）
  const root = tooltip.parentElement as HTMLElement;
  return { tooltip, arrow, root };
}

describe('CardView のツールチップの横位置', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => {
    setViewportWidth(originalWidth);
    vi.restoreAllMocks();
  });

  it('PC 幅で画面内に収まるときは位置を変えない', () => {
    setViewportWidth(1366);
    mockTooltipRect(333);
    const { tooltip, arrow, root } = renderCopper();
    fireEvent.mouseEnter(root);
    expect(tooltip.style.marginLeft).toBe('');
    expect(arrow.style.marginLeft).toBe('');
  });

  it('スマホ幅で左端からはみ出すときは右へずらし、矢印はカードの中心を指したままにする', () => {
    setViewportWidth(390);
    mockTooltipRect(-35);
    const { tooltip, arrow, root } = renderCopper();
    fireEvent.mouseEnter(root);
    expect(tooltip.style.marginLeft).toBe('43px');
    expect(arrow.style.marginLeft).toBe('-43px');
  });

  it('スマホ幅で右端からはみ出すときは左へずらす', () => {
    setViewportWidth(390);
    mockTooltipRect(205);
    const { tooltip, root } = renderCopper();
    fireEvent.mouseEnter(root);
    expect(tooltip.style.marginLeft).toBe('-79px');
  });
});
