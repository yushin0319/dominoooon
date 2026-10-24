// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GameLog from '../GameLog';

// ログ欄（見出し「ゲームログ」を持つスクロール領域）
function getLogBox(): HTMLElement {
  return screen.getByText('ゲームログ').parentElement as HTMLElement;
}

describe('GameLog の自動スクロール', () => {
  // jsdom は scrollIntoView を実装していないので差し替える
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    scrollIntoView.mockClear();
    vi.restoreAllMocks();
  });

  it('最初の表示で scrollIntoView を呼ばない（はみ出しを隠したルートまで動いて画面全体がずれるため）', () => {
    render(<GameLog log={['Game started']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('新しい行が増えたら、ログ欄を一番下までスクロールする', () => {
    const { rerender } = render(<GameLog log={['Game started']} />);
    const box = getLogBox();
    // jsdom はレイアウトしないので、中身の高さとスクロール位置の書き込みを差し替える
    vi.spyOn(box, 'scrollHeight', 'get').mockReturnValue(500);
    const setScrollTop = vi.fn();
    Object.defineProperty(box, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: setScrollTop,
    });

    rerender(<GameLog log={['Game started', 'あなたは銅貨を購入しました']} />);

    expect(setScrollTop).toHaveBeenCalledWith(500);
  });

  it('同じログのまま再描画されたときはスクロールしない', () => {
    const log = ['Game started'];
    const { rerender } = render(<GameLog log={log} />);
    const box = getLogBox();
    const setScrollTop = vi.fn();
    Object.defineProperty(box, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: setScrollTop,
    });

    rerender(<GameLog log={[...log]} />);

    expect(setScrollTop).not.toHaveBeenCalled();
  });
});
