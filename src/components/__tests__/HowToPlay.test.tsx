// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import HowToPlayDialog from '../HowToPlay';

describe('遊び方: キーボード', () => {
  it('説明の欄は Tab で選べる（矢印キー・PageDown で読み進められる）。「閉じる」と行き来する', async () => {
    const user = userEvent.setup();
    render(<HowToPlayDialog onClose={() => {}} />);
    const close = screen.getByRole('button', { name: '閉じる' });
    const body = screen.getByRole('region', { name: '遊び方の説明' });
    expect(close).toHaveFocus();
    await user.tab();
    expect(body).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });
});
