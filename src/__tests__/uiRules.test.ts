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

  it('12px より小さい文字を使わない（text-[9px]〜text-[11px] だったラベルが読みにくかった）', () => {
    const tooSmall = findAll(/text-\[(\d+(?:\.\d+)?)px\]/g).filter((hit) => {
      const px = Number(hit.match(/text-\[(\d+(?:\.\d+)?)px\]/)?.[1]);
      return px < 12;
    });
    expect(tooSmall).toEqual([]);
  });
});
