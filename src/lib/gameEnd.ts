import { CARD } from '../constants/cardNames';
import {
  EMPTY_PILES_TO_END,
  type GameEndReason,
  getEmptyPileCount,
  getGameEndReason,
  getSupplyPile,
} from '../domain/supply';
import type { SupplyPile } from '../types';

/** 属州の残りがこの数以下になったら「まもなく終了」と出す */
const PROVINCE_WARNING_AT = 2;

/** 空の山がこの数以上になったら「まもなく終了」と出す */
const EMPTY_PILES_WARNING_AT = EMPTY_PILES_TO_END - 1;

export interface GameEndStatus {
  provincesLeft: number;
  emptyPiles: number;
  /** normal = まだ先 / near = まもなく終了 / end = 終了条件を満たした（このターンの終わりに終わる） */
  level: 'normal' | 'near' | 'end';
  reason: GameEndReason | null;
}

/** ゲーム終了の近さ（属州の残り・空の山の数）。終了条件そのものは domain/supply.ts の getGameEndReason */
export function getGameEndStatus(supply: SupplyPile[]): GameEndStatus {
  const provincesLeft = getSupplyPile(supply, CARD.PROVINCE)?.count ?? 0;
  const emptyPiles = getEmptyPileCount(supply);
  const reason = getGameEndReason(supply);
  const level = reason
    ? 'end'
    : provincesLeft <= PROVINCE_WARNING_AT ||
        emptyPiles >= EMPTY_PILES_WARNING_AT
      ? 'near'
      : 'normal';
  return { provincesLeft, emptyPiles, level, reason };
}

/** 終わった理由の文（ゲーム終了の表示・ターン終了の予告に使う） */
export function getGameEndReasonText(reason: GameEndReason): string {
  return reason === 'province'
    ? '属州の山がなくなりました'
    : `サプライの山が ${EMPTY_PILES_TO_END} つ空になりました`;
}
