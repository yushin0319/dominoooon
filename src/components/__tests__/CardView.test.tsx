// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import { LONG_PRESS_MS } from '../../lib/pointer';
import { TOOLTIP_GAP } from '../../lib/tooltip';
import CardView from '../CardView';

// framer-motion をモック（jsdomで動かないため）
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      onClick,
      ...rest
    }: Record<string, unknown>) => {
      const props: Record<string, unknown> = {
        className,
        onClick,
        'data-status': rest['data-status'],
      };
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
}));

type Rect = { left: number; top: number; width: number; height: number };

// jsdom はレイアウトしないので、カードとツールチップの位置・大きさを差し替える
function mockRects(card: Rect, tooltip = { width: 256, height: 148 }) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const isTip = this.getAttribute('role') === 'tooltip';
      const r = isTip ? { left: 0, top: 0, ...tooltip } : card;
      return {
        left: r.left,
        top: r.top,
        right: r.left + r.width,
        bottom: r.top + r.height,
        width: r.width,
        height: r.height,
        x: r.left,
        y: r.top,
        toJSON: () => ({}),
      };
    },
  );
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
}

// カード全体を包む要素（ポインターのイベントを受ける）
function cardRoot(name: string): HTMLElement {
  const header = screen.getByText(name, { selector: 'div' });
  return header.closest('[data-card-root]') as HTMLElement;
}

function tooltip(): HTMLElement | null {
  return screen.queryByRole('tooltip');
}

const PC_HAND_CARD = { left: 623, top: 700, width: 120, height: 170 };

describe('CardView: マウスのホバーで出す説明（ツールチップ）', () => {
  const original = { w: window.innerWidth, h: window.innerHeight };
  beforeEach(() => setViewport(1366, 900));
  afterEach(() => {
    setViewport(original.w, original.h);
    vi.restoreAllMocks();
  });

  it('ホバー前は出ていない', () => {
    render(<CardView card={getCardDef('Copper')} />);
    expect(tooltip()).toBeNull();
  });

  it('マウスでホバーすると、body 直下に固定位置で出る（傾いた手札や枠の中でも一緒に傾かず、切れない）', () => {
    mockRects(PC_HAND_CARD);
    render(<CardView card={getCardDef('Copper')} />);
    fireEvent.pointerEnter(cardRoot('銅貨'), { pointerType: 'mouse' });
    const tip = tooltip() as HTMLElement;
    expect(tip).not.toBeNull();
    expect(tip.parentElement).toBe(document.body);
    expect(tip.style.position).toBe('fixed');
    // カードの中央の真上
    expect(tip.style.left).toBe(`${683 - 128}px`);
    expect(tip.style.top).toBe(`${700 - TOOLTIP_GAP - 148}px`);
    expect(tip).toHaveTextContent('+1 コイン');
  });

  it('カードの上に収まらないとき（サプライ 1 行目）は、カードの下に出す', () => {
    mockRects({ left: 459, top: 26, width: 80, height: 112 });
    render(<CardView card={getCardDef('Cellar')} small remaining={10} />);
    fireEvent.pointerEnter(cardRoot('地下貯蔵庫'), { pointerType: 'mouse' });
    const tip = tooltip() as HTMLElement;
    expect(tip.style.top).toBe(`${138 + TOOLTIP_GAP}px`);
    expect(tip.dataset.placement).toBe('bottom');
  });

  it('マウスが離れると消える', () => {
    mockRects(PC_HAND_CARD);
    render(<CardView card={getCardDef('Copper')} />);
    const root = cardRoot('銅貨');
    fireEvent.pointerEnter(root, { pointerType: 'mouse' });
    fireEvent.pointerLeave(root, { pointerType: 'mouse' });
    expect(tooltip()).toBeNull();
  });

  it('「効果:」の見出しは折り返さない', () => {
    mockRects(PC_HAND_CARD);
    render(<CardView card={getCardDef('Cellar')} />);
    fireEvent.pointerEnter(cardRoot('地下貯蔵庫'), { pointerType: 'mouse' });
    const label = screen.getByText('効果:');
    expect(label).toHaveClass('shrink-0', 'whitespace-nowrap');
  });
});

describe('CardView: 指（タッチ）で説明を見る', () => {
  const original = { w: window.innerWidth, h: window.innerHeight };
  beforeEach(() => {
    setViewport(390, 844);
    mockRects({ left: 109, top: 300, width: 80, height: 112 });
  });
  afterEach(() => {
    setViewport(original.w, original.h);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // 実機のブラウザがタップで出す順に近い並び
  function tap(el: HTMLElement) {
    fireEvent.pointerEnter(el, { pointerType: 'touch' });
    fireEvent.pointerDown(el, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(el, { pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerLeave(el, { pointerType: 'touch' });
    // 互換のマウスイベント（ここで出していたのが「出たまま残る」原因）
    fireEvent.mouseEnter(el);
    // クリックはカード本体に届く（ツールチップは body 直下なので、包む要素の子はカード本体だけ）
    fireEvent.click(el.firstElementChild as HTMLElement, { detail: 1 });
  }

  it('触れただけ（互換のマウスイベント）では出ない', () => {
    render(<CardView card={getCardDef('Chapel')} small />);
    const root = cardRoot('礼拝堂');
    fireEvent.pointerEnter(root, { pointerType: 'touch' });
    fireEvent.mouseEnter(root);
    expect(tooltip()).toBeNull();
  });

  it('押しても何も起きないカードは、タップで説明が出て、ほかの場所を押すと消える', () => {
    render(<CardView card={getCardDef('Chapel')} small />);
    tap(cardRoot('礼拝堂'));
    expect(tooltip()).toHaveTextContent('手札から最大4枚廃棄');
    fireEvent.pointerDown(document.body, { pointerType: 'touch' });
    expect(tooltip()).toBeNull();
  });

  it('同じカードをもう一度タップすると閉じる', () => {
    render(<CardView card={getCardDef('Chapel')} small />);
    const root = cardRoot('礼拝堂');
    tap(root);
    tap(root);
    expect(tooltip()).toBeNull();
  });

  it('押すと確認画面が開くカード（使える手札・買えるカード）は、タップで押した処理だけ（説明は確認画面にある）', () => {
    const onClick = vi.fn();
    render(<CardView card={getCardDef('Workshop')} onClick={onClick} />);
    tap(cardRoot('工房'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tooltip()).toBeNull();
  });

  it('選択画面のカード（detailOnTap）は、タップで選ぶのと一緒に説明も出す', () => {
    const onClick = vi.fn();
    render(
      <CardView
        card={getCardDef('Cellar')}
        small
        onClick={onClick}
        detailOnTap
      />,
    );
    tap(cardRoot('地下貯蔵庫'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tooltip()).toHaveTextContent('手札を捨てて同数ドロー');
  });

  it('長押しすると説明が出て、指を離したあとのクリックは押した処理に届かない', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<CardView card={getCardDef('Workshop')} onClick={onClick} />);
    const root = cardRoot('工房');
    fireEvent.pointerDown(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(tooltip()).toHaveTextContent('コスト4以下を1枚獲得');
    fireEvent.pointerUp(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(root.firstElementChild as HTMLElement, { detail: 1 });
    expect(onClick).not.toHaveBeenCalled();
    expect(tooltip()).not.toBeNull();
  });

  it('長押しの途中で指が動いたら（スクロールしようとした）説明は出さない', () => {
    vi.useFakeTimers();
    render(<CardView card={getCardDef('Workshop')} onClick={() => {}} />);
    const root = cardRoot('工房');
    fireEvent.pointerDown(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 40,
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
    expect(tooltip()).toBeNull();
  });

  it('長押しの前に指を離したら説明は出ず、普通のタップになる', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<CardView card={getCardDef('Workshop')} onClick={onClick} />);
    const root = cardRoot('工房');
    fireEvent.pointerDown(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS - 100);
    });
    fireEvent.pointerUp(root, {
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(root.firstElementChild as HTMLElement, { detail: 1 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tooltip()).toBeNull();
  });
});

describe('CardView: 使える・使えないの見た目', () => {
  it('使える（available）カードは光る枠を付ける', () => {
    render(
      <CardView
        card={getCardDef('Workshop')}
        status="available"
        onClick={() => {}}
      />,
    );
    const card = screen.getByText('工房', { selector: 'div' })
      .parentElement as HTMLElement;
    expect(card.dataset.status).toBe('available');
    expect(card.className).toMatch(/ring-emerald/);
  });

  it('使えない（unavailable）カードは暗くし（透けさせない）、指カーソルにしない', () => {
    render(<CardView card={getCardDef('Estate')} status="unavailable" />);
    const card = screen.getByText('屋敷', { selector: 'div' })
      .parentElement as HTMLElement;
    expect(card.dataset.status).toBe('unavailable');
    expect(card.className).toMatch(/brightness-/);
    expect(card.className).not.toMatch(/opacity-/);
    expect(card.className).not.toMatch(/cursor-pointer/);
  });
});

describe('CardView: 文字がバッジに隠れない', () => {
  it('大きいカードの本文は、コストの丸の分だけ下に余白をとる', () => {
    render(<CardView card={getCardDef('Harbinger')} />);
    const body = screen.getByText(/捨て札から1枚をデッキの上に/)
      .parentElement as HTMLElement;
    expect(body.className).toMatch(/pb-10/);
  });

  it('小さいカードで残り枚数を出すときは、名前の右にバッジの分の余白をとる', () => {
    render(<CardView card={getCardDef('Cellar')} small remaining={10} />);
    const header = screen.getByText('地下貯蔵庫', { selector: 'div' });
    expect(header.className).toContain('pr-[25px]');
  });
});
