// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TurnBar from '../TurnBar';

/** 一言・お知らせを出す所（読み上げの対象） */
function liveRegion(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[aria-live]');
  if (!el) throw new Error('no live region');
  return el;
}

describe('TurnBar: 次に何をするかの一言と、ターンを進めるボタン', () => {
  it('一言と主ボタンを出し、押すと進める', () => {
    const onPrimary = vi.fn();
    render(
      <TurnBar
        message="光っているカードを買うか「ターン終了」"
        primaryLabel="ターン終了"
        onPrimary={onPrimary}
      />,
    );
    expect(liveRegion()).toHaveTextContent(
      '光っているカードを買うか「ターン終了」',
    );
    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('「」で囲んだボタン名の途中では折り返さない（狭い画面で「購入へ進\\nむ」と切れていた）', () => {
    render(<TurnBar message="光っているカードをプレイするか「購入へ進む」" />);
    expect(screen.getByText('「購入へ進む」')).toHaveClass('whitespace-nowrap');
    expect(screen.getByText(/光っているカードをプレイするか/)).toBeVisible();
  });

  it('ボタンは押しやすい高さ（44px 以上）', () => {
    render(
      <TurnBar
        message="m"
        primaryLabel="購入へ進む"
        onPrimary={() => {}}
        undoCardName="鉱山"
        onUndo={() => {}}
      />,
    );
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toMatch(/\bmin-h-11\b/);
    }
  });

  it('お知らせがある間は一言の代わりにお知らせを出す（ボタンはそのまま押せる）', () => {
    const onPrimary = vi.fn();
    render(
      <TurnBar
        message="光っているカードを買うか「ターン終了」"
        notice="あなたのターン"
        primaryLabel="ターン終了"
        onPrimary={onPrimary}
      />,
    );
    expect(screen.getByText('あなたのターン')).toBeVisible();
    expect(liveRegion()).not.toHaveTextContent('光っているカードを買うか');
    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('取り消せる購入があるときだけ「購入を取り消す」を出す（読み上げにはカード名を含める）', () => {
    const onUndo = vi.fn();
    const { rerender } = render(
      <TurnBar message="m" primaryLabel="ターン終了" onPrimary={() => {}} />,
    );
    expect(screen.queryByText('購入を取り消す')).toBeNull();

    rerender(
      <TurnBar
        message="m"
        primaryLabel="ターン終了"
        onPrimary={() => {}}
        undoCardName="鉱山"
        onUndo={onUndo}
      />,
    );
    const undo = screen.getByRole('button', { name: '鉱山の購入を取り消す' });
    expect(undo).toHaveTextContent('購入を取り消す');
    fireEvent.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('AI の番（busy）は考え中の印を出し、ボタンは出さない', () => {
    render(<TurnBar message="AIが考えています..." busy />);
    expect(screen.getByText('AIが考えています...')).toBeVisible();
    expect(screen.getByTestId('turn-bar-spinner')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
