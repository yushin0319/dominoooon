// @vitest-environment node
import { describe, expect, it } from 'vitest';

// 画面の部品のソース（テストは除く）。見た目の決まりを、ソースの書き方で確かめる
const sources = import.meta.glob<string>(
  ['../components/*.tsx', '../pages/*.tsx', '../App.tsx', '../index.css'],
  { query: '?raw', import: 'default', eager: true },
);

/** パターンに当たった所を「ファイル名: 当たった文字列」で返す */
function findAll(pattern: RegExp): string[] {
  return Object.entries(sources).flatMap(([file, src]) =>
    [...src.matchAll(pattern)].map((m) => `${file}: ${m[0]}`),
  );
}

describe('見た目の決まり', () => {
  it('ソースが読めている（決まりを確かめる対象が空ではない）', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
  });

  it('dark: を使わない（OS がライトモードの端末で、プレイエリアなどが白く浮いていた。この遊びは常に暗い配色）', () => {
    expect(findAll(/\bdark:[\w-[\]/.%]+/g)).toEqual([]);
  });

  it('CSS の動き（animate-*・押したときの縮み active:scale-*）は motion-safe: を付けて、OS の「動きを減らす」設定では止める', () => {
    // クラス名 1 つ分（空白・引用符で区切る）。CSS 変数の定義（--animate-fade-in）は除く
    const unguarded = findAll(
      /(?<=[\s"'`])(?!--)[\w:[\]-]*(?:animate-(?!none)[\w-]+|active:scale-[\w-]+)/g,
    ).filter((hit) => !hit.split(': ')[1].startsWith('motion-safe:'));
    expect(unguarded).toEqual([]);
  });

  it('ログ欄のなめらかなスクロールも、動きを減らす設定では切る', () => {
    const smooth = findAll(/[^"'`]*\bscroll-smooth\b[^"'`]*/g);
    expect(smooth.length).toBeGreaterThan(0);
    for (const hit of smooth) expect(hit).toMatch(/motion-reduce:scroll-auto/);
  });

  it('12px より小さい文字を使わない（text-[9px]〜text-[11px] だったラベルが読みにくかった）', () => {
    const tooSmall = findAll(/text-\[(\d+(?:\.\d+)?)px\]/g).filter((hit) => {
      const px = Number(hit.match(/text-\[(\d+(?:\.\d+)?)px\]/)?.[1]);
      return px < 12;
    });
    expect(tooSmall).toEqual([]);
  });
});
