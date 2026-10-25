// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type DialogKeyboardOptions,
  useDialogKeyboard,
} from '../useDialogKeyboard';

function Dialog({
  onClose,
  options,
  children,
}: {
  onClose: () => void;
  options?: DialogKeyboardOptions;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogKeyboard(ref, onClose, options);
  return (
    <div ref={ref} role="dialog" aria-label="テスト">
      {children}
    </div>
  );
}

describe('useDialogKeyboard: 開いたときのフォーカス', () => {
  it('既定は最後の押せるボタン（押せないボタンは飛ばす）', () => {
    render(
      <Dialog onClose={() => {}}>
        <button type="button">A</button>
        <button type="button">B</button>
        <button type="button" disabled>
          確定
        </button>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it("initialFocus: 'first' なら最初の押せる要素（選択画面のカード）", () => {
    render(
      <Dialog onClose={() => {}} options={{ initialFocus: 'first' }}>
        <button type="button">村</button>
        <button type="button" disabled>
          確定
        </button>
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: '村' })).toHaveFocus();
  });

  it('initialFocus に要素を渡せば、その要素（確認の「やめる」）', () => {
    function WithRef() {
      const cancelRef = useRef<HTMLButtonElement>(null);
      return (
        <Dialog onClose={() => {}} options={{ initialFocus: cancelRef }}>
          <button ref={cancelRef} type="button">
            やめる
          </button>
          <button type="button">ターン終了</button>
        </Dialog>
      );
    }
    render(<WithRef />);
    expect(screen.getByRole('button', { name: 'やめる' })).toHaveFocus();
  });
});

describe('useDialogKeyboard: Tab はダイアログの中で回す', () => {
  it('最後で Tab → 最初へ、最初で Shift+Tab → 最後へ（押せないボタンは数えない）', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">外</button>
        <Dialog onClose={() => {}}>
          <button type="button">A</button>
          <button type="button">B</button>
          <button type="button" disabled>
            確定
          </button>
        </Dialog>
      </>,
    );
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'B' })).toHaveFocus();
  });

  it('フォーカスがダイアログの外にあるときに Tab を押すと、ダイアログの最初へ戻す', async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">外</button>
        <Dialog onClose={() => {}}>
          <button type="button">A</button>
          <button type="button">B</button>
        </Dialog>
      </>,
    );
    screen.getByRole('button', { name: '外' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
  });
});

describe('useDialogKeyboard: Esc と閉じたあと', () => {
  it('Esc で閉じる', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog onClose={onClose}>
        <button type="button">閉じる</button>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closeOnEscape: false なら Esc では閉じない（閉じると効果が消える選択画面）', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog onClose={onClose} options={{ closeOnEscape: false }}>
        <button type="button">確定</button>
      </Dialog>,
    );
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('閉じたら、開く前にフォーカスがあった所へ戻す', async () => {
    const user = userEvent.setup();
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            開く
          </button>
          {open && (
            <Dialog onClose={() => setOpen(false)}>
              <button type="button">閉じる</button>
            </Dialog>
          )}
        </>
      );
    }
    render(<Page />);
    await user.click(screen.getByRole('button', { name: '開く' }));
    expect(screen.getByRole('button', { name: '閉じる' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: '開く' })).toHaveFocus();
  });
});
