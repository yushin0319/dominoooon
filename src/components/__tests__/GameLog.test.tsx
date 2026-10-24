// @vitest-environment jsdom

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GameLog, { GameLogDialog } from '../GameLog';

// ログ欄（見出し「ゲームログ」を持つスクロール領域）
function getLogBox(): HTMLElement {
  return screen
    .getByText('ゲームログ')
    .closest('[data-game-log]') as HTMLElement;
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
    render(<GameLog log={['ゲーム開始']} />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('新しい行が増えたら、ログ欄を一番下までスクロールする', () => {
    const { rerender } = render(<GameLog log={['ゲーム開始']} />);
    const box = getLogBox();
    // jsdom はレイアウトしないので、中身の高さとスクロール位置の書き込みを差し替える
    vi.spyOn(box, 'scrollHeight', 'get').mockReturnValue(500);
    const setScrollTop = vi.fn();
    Object.defineProperty(box, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: setScrollTop,
    });

    rerender(<GameLog log={['ゲーム開始', 'あなたは銅貨を購入しました']} />);

    expect(setScrollTop).toHaveBeenCalledWith(500);
  });

  it('同じログのまま再描画されたときはスクロールしない', () => {
    const log = ['ゲーム開始'];
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

describe('GameLog: ターンの区切り', () => {
  const log = [
    'ゲーム開始',
    '--- ラウンド 1: あなたのターン ---',
    'あなたは銅貨を購入しました',
    '--- ラウンド 1: AIのターン ---',
    'AI: 5 コイン → 銀貨を購入',
  ];

  it('区切りの行は「---」を外して、区切り線として出す（自分のターンにも AI のターンにも）', () => {
    render(<GameLog log={log} />);
    const headers = [
      ...getLogBox().querySelectorAll<HTMLElement>('[data-log-header]'),
    ];
    expect(headers.map((h) => h.textContent)).toEqual([
      'ラウンド 1: あなたのターン',
      'ラウンド 1: AIのターン',
    ]);
    expect(getLogBox().textContent).not.toContain('---');
  });

  it('ふつうの行は区切りにしない', () => {
    render(<GameLog log={log} />);
    expect(screen.getByText('あなたは銅貨を購入しました')).not.toHaveAttribute(
      'data-log-header',
    );
  });
});

describe('GameLog: 狭い画面では広げて読める', () => {
  it('「全部見る」を押すと onExpand を呼ぶ（渡さなければボタンを出さない）', () => {
    const onExpand = vi.fn();
    const { rerender } = render(
      <GameLog log={['ゲーム開始']} onExpand={onExpand} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /全部見る/ }));
    expect(onExpand).toHaveBeenCalledTimes(1);

    rerender(<GameLog log={['ゲーム開始']} />);
    expect(screen.queryByRole('button', { name: /全部見る/ })).toBeNull();
  });

  it('広げた画面にログを全部出し、「閉じる」と Esc で閉じる', () => {
    const onClose = vi.fn();
    const log = Array.from({ length: 30 }, (_, i) => `行 ${i + 1}`);
    render(<GameLogDialog log={log} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { name: 'ゲームログ' });
    expect(within(dialog).getByText('行 1')).toBeInTheDocument();
    expect(within(dialog).getByText('行 30')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: '閉じる' }),
    ).toHaveFocus();

    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
