// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  it('題名をダイアログの名前に、説明をダイアログの説明にする', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', {
      name: 'まだ買えるカードがあります',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription(
      '残り 3 コイン・購入 1 回で買えるカードがあります。このままターンを終えますか？',
    );
  });

  it('開いたときのフォーカスは安全な方（やめる）。Enter を続けて押しても進まない', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'やめる' })).toHaveFocus();
  });

  it('ゲームをやめる確認でも、フォーカスは「続ける」（やめる＝確定に当てない）', () => {
    render(
      <ConfirmDialog
        title="ゲームをやめますか？"
        message="このゲームは終わりになり、続きから遊べなくなります。"
        confirmLabel="やめる"
        cancelLabel="続ける"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: '続ける' })).toHaveFocus();
  });

  it('Tab はダイアログの中で回る', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.tab();
    expect(screen.getByRole('button', { name: 'ターン終了' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'やめる' })).toHaveFocus();
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
    // 外側の暗い幕（読み上げ・Tab の対象外のボタン）
    const backdrop = document.querySelector(
      'button[aria-hidden="true"]',
    ) as HTMLElement;
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
