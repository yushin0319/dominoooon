// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';

function renderDialog() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="まだ買えるカードがあります"
      message="残り 3 コイン・購入 1 回で買えるカードがあります。このままターンを終えますか？"
      confirmLabel="ターン終了"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog: 取り返しのつかない操作の前の確認', () => {
  it('題名と説明を出し、確定ボタンにフォーカスする', () => {
    renderDialog();
    expect(
      screen.getByRole('dialog', { name: 'まだ買えるカードがあります' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '残り 3 コイン・購入 1 回で買えるカードがあります。このままターンを終えますか？',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'ターン終了' })).toHaveFocus();
  });

  it('確定ボタンで onConfirm、「やめる」で onCancel', () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'ターン終了' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'やめる' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape キーと、外側の暗い所を押すとやめる', () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('ボタンは押しやすい高さ（44px 以上）', () => {
    renderDialog();
    for (const b of screen.getAllByRole('button')) {
      expect(b.className).toMatch(/\bmin-h-11\b/);
    }
  });
});
