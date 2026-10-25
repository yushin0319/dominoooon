// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardDef } from '../../domain/card';
import { SAVE_KEY } from '../../stores/gameSave';
import { useGameStore } from '../../stores/gameStore';
import ErrorBoundary, { getAppHomeUrl } from '../ErrorBoundary';

function Boom(): never {
  throw new Error('こわれた');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary: エラー画面', () => {
  it('戻り先はアプリの置き場所（GitHub Pages では /dominoooon/。「/」だと別のサイトの 404 になっていた）', () => {
    expect(getAppHomeUrl('/dominoooon/')).toBe('/dominoooon/');
    expect(getAppHomeUrl('/')).toBe('/');
  });

  it('ボタンは押しやすい高さ（44px = min-h-11）', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    for (const name of ['再試行', 'タイトルに戻る']) {
      expect(screen.getByRole('button', { name }).className).toMatch(
        /\bmin-h-11\b/,
      );
    }
  });

  it('「タイトルに戻る」は途中のゲームの保存を消す（壊れた状態を読み直して、またエラーにならないように）', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const kingdom = [
      'Cellar',
      'Chapel',
      'Village',
      'Workshop',
      'Smithy',
      'Remodel',
      'Militia',
      'Market',
      'Mine',
      'Witch',
    ].map(getCardDef);
    useGameStore.getState().startGame(kingdom, 'bigMoney');
    expect(localStorage.getItem(SAVE_KEY)).toContain('"page":"game"');

    const navigate = vi.fn();
    render(
      <ErrorBoundary navigate={navigate}>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'タイトルに戻る' }));
    const saved = localStorage.getItem(SAVE_KEY);
    expect(saved === null || !saved.includes('"page":"game"')).toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      getAppHomeUrl(import.meta.env.BASE_URL),
    );
  });
});
