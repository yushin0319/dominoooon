import { type CardInstance, CardType, type SupplyPile } from '../types';

/**
 * カードの「今使えるか」の見た目。
 * available = 押すと使える（光る枠） / unavailable = 押しても何も起きない（暗く表示）。
 * 使える・使えないを見分ける場面でなければ undefined（印を付けない）。
 */
export type CardStatus = 'available' | 'unavailable';

/**
 * 手札のカードが今プレイできるか。
 * canPlayActions は「人間の番・アクションフェーズ・アクションが残っている・選択待ちなし」。
 * そのときアクションカードだけがプレイでき、財宝・勝利点・呪いは押しても何も起きない。
 */
export function getHandCardStatus(
  card: CardInstance,
  canPlayActions: boolean,
): CardStatus | undefined {
  if (!canPlayActions) return undefined;
  return card.def.types.includes(CardType.Action) ? 'available' : 'unavailable';
}

/** 手札にプレイできるカードが 1 枚でもあるか（案内文を出すかどうか） */
export function hasPlayableCard(
  hand: CardInstance[],
  canPlayActions: boolean,
): boolean {
  return hand.some(
    (card) => getHandCardStatus(card, canPlayActions) === 'available',
  );
}

/**
 * サプライのカードが今買えるか。
 * 購入フェーズ（canBuy）で手持ちのコイン（maxCost）が分かるときだけ判定する。
 * 売り切れ、またはコストが手持ちより高いカードは買えない。
 */
export function getSupplyPileStatus(
  pile: SupplyPile,
  canBuy: boolean,
  maxCost: number | undefined,
): CardStatus | undefined {
  if (!canBuy || maxCost === undefined) return undefined;
  return pile.count > 0 && pile.card.cost <= maxCost
    ? 'available'
    : 'unavailable';
}
