// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { useReducedMotionConfig } from 'framer-motion';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useGameStore } from '../stores/gameStore';

// 画面の中身の代わりに、framer-motion が「動きを減らす」と判断しているかを出す
vi.mock('../pages/TitlePage', () => ({
  default: function Probe() {
    const reduce = useReducedMotionConfig();
    return <p data-testid="reduce">{String(reduce)}</p>;
  },
}));

describe('App: OS の「動きを減らす」設定に従う', () => {
  beforeAll(() => {
    // OS で「視差効果を減らす / アニメーションを減らす」をオンにしている端末
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });

  it('framer-motion の動き（手札の登場・持ち上げ・場に出す・AI のターン）を止める', () => {
    useGameStore.setState({ page: 'title' });
    render(<App />);
    expect(screen.getByTestId('reduce')).toHaveTextContent('true');
  });
});
