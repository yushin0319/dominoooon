import { calculateVP } from '../domain/player';
import type { CardDef, CardInstance, PlayerState } from '../types';
import { CardType } from '../types';

export interface PlayerStatusCounts {
  /** 山札の枚数（次に引くカード。0 になったら捨て札を切り直す） */
  deck: number;
  /** 捨て札の枚数 */
  discard: number;
  /** 勝利点（手札・山札・捨て札・場のすべて。結果画面と同じ数え方） */
  vp: number;
}

/** 山札・捨て札の枚数と勝利点 */
export function getPlayerStatus(player: PlayerState): PlayerStatusCounts {
  return {
    deck: player.deck.length,
    discard: player.discard.length,
    vp: calculateVP(player),
  };
}

/** 一覧で色分けするカードの種類 */
export type CardKind = 'treasure' | 'victory' | 'curse' | 'action';

export interface CardGroup {
  name: string;
  nameJa: string;
  count: number;
  kind: CardKind;
}

const KIND_ORDER: CardKind[] = ['treasure', 'victory', 'curse', 'action'];

function getCardKind(def: CardDef): CardKind {
  if (def.types.includes(CardType.Treasure)) return 'treasure';
  if (def.types.includes(CardType.Victory)) return 'victory';
  if (def.types.includes(CardType.Curse)) return 'curse';
  return 'action';
}

/**
 * カードの一覧（捨て札の中身）。同じカードはまとめて枚数にし、
 * 財宝 → 勝利点 → 呪い → アクションの順、同じ種類の中はコストの高い順に並べる
 */
export function groupCards(cards: CardInstance[]): CardGroup[] {
  const groups = new Map<string, CardGroup & { cost: number }>();
  for (const { def } of cards) {
    const group = groups.get(def.name);
    if (group) {
      group.count += 1;
    } else {
      groups.set(def.name, {
        name: def.name,
        nameJa: def.nameJa,
        count: 1,
        kind: getCardKind(def),
        cost: def.cost,
      });
    }
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
        b.cost - a.cost ||
        a.nameJa.localeCompare(b.nameJa, 'ja'),
    )
    .map(({ cost: _cost, ...group }) => group);
}
