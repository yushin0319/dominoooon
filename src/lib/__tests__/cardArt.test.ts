// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CARD_DEFS, getCardDef } from '../../domain/card';
import { getCardArtSlug, getCardArtUrl } from '../cardArt';

// 公開フォルダにある絵のファイル（読み込まず、名前だけ見る）
const artFiles = Object.keys(import.meta.glob('/public/cards/*.webp'));

describe('getCardArtSlug: カードの絵のファイル名', () => {
  it('英語名を小文字にする', () => {
    expect(getCardArtSlug('Village')).toBe('village');
  });

  it('名前の空白は _ にする', () => {
    expect(getCardArtSlug('Throne Room')).toBe('throne_room');
    expect(getCardArtSlug('Council Room')).toBe('council_room');
  });
});

describe('getCardArtUrl: カードの絵の URL', () => {
  it('公開フォルダの cards/ の webp を指す', () => {
    expect(getCardArtUrl(getCardDef('Throne Room'))).toBe(
      `${import.meta.env.BASE_URL}cards/throne_room.webp`,
    );
  });

  it('どのカードにも絵のファイルがある', () => {
    const missing = Object.values(CARD_DEFS)
      .map((def) => `/public/cards/${getCardArtSlug(def.name)}.webp`)
      .filter((path) => !artFiles.includes(path));
    expect(missing).toEqual([]);
  });
});
