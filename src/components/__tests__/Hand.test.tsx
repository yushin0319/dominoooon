// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import {
  EMPTY_HAND_ROW_HEIGHT,
  getHandLayout,
  MIN_TOUCH_STRIP,
} from '../../lib/handLayout';
import type { CardInstance } from '../../types';
import Hand from '../Hand';

// framer-motion をモック（jsdomで動かないため）。並べ方の確認に必要な値を data 属性で通す
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      onClick,
      animate,
      whileHover,
      ...rest
    }: Record<string, unknown>) => {
      const a = animate as { rotate?: number } | undefined;
      const h = whileHover as { zIndex?: number } | undefined;
      const props: Record<string, unknown> = {
        className,
        style,
        onClick,
        'data-hand-card': rest['data-hand-card'],
        'data-status': rest['data-status'],
        'data-rotate': a?.rotate,
        'data-hover': h ? 'lift' : undefined,
        'data-hover-z': h?.zIndex,
      };
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

function makeHand(names: string[]): CardInstance[] {
  return names.map((name, i) => ({
    instanceId: `${name}-${i}`,
    def: getCardDef(name),
  }));
}

function copper(count: number): CardInstance[] {
  return makeHand(Array.from({ length: count }, () => 'Copper'));
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function handCards(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-hand-card]')];
}

// 手札のカード本体（data-status を持つ要素）
function cardOf(name: string, nth = 0): HTMLElement {
  const headers = screen.getAllByText(name, { selector: 'div' });
  return headers[nth].parentElement as HTMLElement;
}

describe('Hand のカードの並べ方', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => setViewportWidth(originalWidth));

  it('PC 幅（1366px）では従来どおり 2 枚目以降を 16px 重ね、扇形に傾ける', () => {
    setViewportWidth(1366);
    render(<Hand hand={copper(5)} />);
    expect(handCards().map((el) => el.style.marginLeft)).toEqual([
      '0px',
      '-16px',
      '-16px',
      '-16px',
      '-16px',
    ]);
    expect(handCards().map((el) => el.dataset.rotate)).toEqual([
      '-10',
      '-5',
      '0',
      '5',
      '10',
    ]);
  });

  it('スマホ幅（390px）では傾けずに並べ、各カードの見える帯を 44px 以上にする', () => {
    setViewportWidth(390);
    render(<Hand hand={copper(5)} />);
    const { overlap } = getHandLayout(5, 390);
    expect(120 - overlap).toBeGreaterThanOrEqual(MIN_TOUCH_STRIP);
    expect(handCards().map((el) => el.style.marginLeft)).toEqual([
      '0px',
      `-${overlap}px`,
      `-${overlap}px`,
      `-${overlap}px`,
      `-${overlap}px`,
    ]);
    expect(handCards().every((el) => el.dataset.rotate === '0')).toBe(true);
  });

  it('スマホ幅で 9 枚なら、横スクロールできる欄に入れる', () => {
    setViewportWidth(390);
    render(<Hand hand={copper(9)} />);
    const scroller = handCards()[0].closest('.overflow-x-auto');
    expect(scroller).not.toBeNull();
  });

  it('画面幅が変わったら（resize）並べ方を計算し直す', () => {
    setViewportWidth(1366);
    render(<Hand hand={copper(5)} />);
    expect(handCards()[1].style.marginLeft).toBe('-16px');

    act(() => {
      setViewportWidth(390);
      window.dispatchEvent(new Event('resize'));
    });
    expect(handCards()[1].style.marginLeft).toBe(
      `-${getHandLayout(5, 390).overlap}px`,
    );
  });
});

describe('Hand: 使えるカードと使えないカードの見分け（アクションフェーズ）', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => setViewportWidth(originalWidth));
  const hand = makeHand(['Copper', 'Estate', 'Workshop', 'Estate', 'Copper']);

  it('アクションカードだけが押せる。銅貨・屋敷を押しても onPlay は呼ばれない', () => {
    setViewportWidth(1366);
    const onPlay = vi.fn();
    render(<Hand hand={hand} onPlay={onPlay} canPlay />);
    fireEvent.click(cardOf('屋敷'));
    fireEvent.click(cardOf('銅貨'));
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.click(cardOf('工房'));
    expect(onPlay).toHaveBeenCalledWith('Workshop-2');
  });

  it('使えるカードは光る枠・指カーソル・持ち上げ、使えないカードは暗く・持ち上げなし', () => {
    setViewportWidth(1366);
    render(<Hand hand={hand} onPlay={() => {}} canPlay />);
    expect(cardOf('工房').dataset.status).toBe('available');
    expect(cardOf('屋敷').dataset.status).toBe('unavailable');
    expect(cardOf('銅貨').dataset.status).toBe('unavailable');
    const [c0, , c2] = handCards();
    expect(c2.dataset.hover).toBe('lift');
    expect(c2.className).toMatch(/cursor-pointer/);
    expect(c0.dataset.hover).toBeUndefined();
    expect(c0.className).not.toMatch(/cursor-pointer/);
  });

  it('案内文は手札の欄には出さない（手札のすぐ上の帯 TurnBar に出す）', () => {
    setViewportWidth(1366);
    render(<Hand hand={hand} onPlay={() => {}} canPlay />);
    expect(screen.queryByText(/光っているカード/)).toBeNull();
  });

  it('プレイできない場面では、どのカードにも印を付けない', () => {
    setViewportWidth(1366);
    render(<Hand hand={hand} />);
    expect(cardOf('工房').dataset.status).toBeUndefined();
    expect(cardOf('屋敷').dataset.status).toBeUndefined();
  });
});

describe('Hand: ホバーで持ち上げたカードが隣を覆わない', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => setViewportWidth(originalWidth));
  const hand = makeHand([
    'Workshop',
    'Workshop',
    'Workshop',
    'Estate',
    'Copper',
  ]);

  it('PC 幅（扇形）では従来どおりホバーしたカードを手前に出す', () => {
    setViewportWidth(1366);
    render(<Hand hand={hand} onPlay={() => {}} canPlay />);
    expect(handCards()[1].dataset.hoverZ).toBe('50');
  });

  it('スマホ幅（重なりが大きい）では手前に出さず、上にずらすだけにする', () => {
    setViewportWidth(390);
    render(<Hand hand={hand} onPlay={() => {}} canPlay />);
    expect(handCards()[1].dataset.hover).toBe('lift');
    expect(handCards()[1].dataset.hoverZ).toBeUndefined();
  });
});

describe('Hand: 手札が空のとき', () => {
  const originalWidth = window.innerWidth;
  afterEach(() => setViewportWidth(originalWidth));

  const note = '財宝 3 枚を自動で場に出しました（合計 4 コイン）';

  it('空のときは一言を出す', () => {
    setViewportWidth(390);
    render(<Hand hand={[]} emptyMessage={note} />);
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(handCards()).toHaveLength(0);
  });

  it('スマホ幅では欄を低くする（カードがあるときの列の高さより低い）', () => {
    setViewportWidth(390);
    render(<Hand hand={[]} emptyMessage={note} />);
    const row = screen
      .getByText(note)
      .closest('[data-hand-row]') as HTMLElement;
    expect(row.style.height).toBe(`${EMPTY_HAND_ROW_HEIGHT}px`);
  });

  it('カードがあるときは一言を出さない', () => {
    setViewportWidth(390);
    render(<Hand hand={copper(2)} emptyMessage={note} />);
    expect(screen.queryByText(note)).not.toBeInTheDocument();
  });
});
