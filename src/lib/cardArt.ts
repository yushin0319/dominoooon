import type { CardDef } from '../types';

/** カードの絵のファイル名（英語名を小文字にし、空白を _ にする: Throne Room → throne_room） */
export function getCardArtSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

/** カードの絵（public/cards/ の webp）の URL。GitHub Pages の /dominoooon/ 配下でも引けるよう BASE_URL を付ける */
export function getCardArtUrl(def: CardDef): string {
  return `${import.meta.env.BASE_URL}cards/${getCardArtSlug(def.name)}.webp`;
}
