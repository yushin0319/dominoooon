import type { CardDef, CardInstance, PlayerState } from '../types';
import { CardType } from '../types';

export const CARD_DEFS: Record<string, CardDef> = {
  // ===== Treasure (3) =====
  Copper: {
    name: 'Copper',
    nameJa: '銅貨',
    cost: 0,
    types: [CardType.Treasure],
    effects: { coins: 1 },
  },
  Silver: {
    name: 'Silver',
    nameJa: '銀貨',
    cost: 3,
    types: [CardType.Treasure],
    effects: { coins: 2 },
  },
  Gold: {
    name: 'Gold',
    nameJa: '金貨',
    cost: 6,
    types: [CardType.Treasure],
    effects: { coins: 3 },
  },

  // ===== Victory (3) =====
  Estate: {
    name: 'Estate',
    nameJa: '屋敷',
    cost: 2,
    types: [CardType.Victory],
    effects: {},
    vpValue: 1,
  },
  Duchy: {
    name: 'Duchy',
    nameJa: '公領',
    cost: 5,
    types: [CardType.Victory],
    effects: {},
    vpValue: 3,
  },
  Province: {
    name: 'Province',
    nameJa: '属州',
    cost: 8,
    types: [CardType.Victory],
    effects: {},
    vpValue: 6,
  },

  // ===== Curse (1) =====
  Curse: {
    name: 'Curse',
    nameJa: '呪い',
    cost: 0,
    types: [CardType.Curse],
    effects: {},
    vpValue: -1,
  },

  // ===== Kingdom (26) =====
  Cellar: {
    name: 'Cellar',
    nameJa: '地下貯蔵庫',
    cost: 2,
    types: [CardType.Action],
    effects: { actions: 1, custom: 'cellar' },
  },
  Chapel: {
    name: 'Chapel',
    nameJa: '礼拝堂',
    cost: 2,
    types: [CardType.Action],
    effects: { custom: 'chapel' },
  },
  Moat: {
    name: 'Moat',
    nameJa: '堀',
    cost: 2,
    types: [CardType.Action, CardType.Reaction],
    effects: { cards: 2 },
  },
  Harbinger: {
    name: 'Harbinger',
    nameJa: '先触れ',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'harbinger' },
  },
  Merchant: {
    name: 'Merchant',
    nameJa: '商人',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'merchant' },
  },
  Vassal: {
    name: 'Vassal',
    nameJa: '家臣',
    cost: 3,
    types: [CardType.Action],
    effects: { coins: 2, custom: 'vassal' },
  },
  Village: {
    name: 'Village',
    nameJa: '村',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 2 },
  },
  Workshop: {
    name: 'Workshop',
    nameJa: '工房',
    cost: 3,
    types: [CardType.Action],
    effects: { custom: 'workshop' },
  },
  Bureaucrat: {
    name: 'Bureaucrat',
    nameJa: '官僚',
    cost: 4,
    types: [CardType.Action, CardType.Attack],
    effects: { custom: 'bureaucrat' },
  },
  Gardens: {
    name: 'Gardens',
    nameJa: '庭園',
    cost: 4,
    types: [CardType.Victory],
    effects: {},
    vpCalculator: (player: PlayerState) => {
      const totalCards =
        player.deck.length +
        player.hand.length +
        player.discard.length +
        player.playArea.length;
      return Math.floor(totalCards / 10);
    },
  },
  Militia: {
    name: 'Militia',
    nameJa: '民兵',
    cost: 4,
    types: [CardType.Action, CardType.Attack],
    effects: { coins: 2, custom: 'militia' },
  },
  Moneylender: {
    name: 'Moneylender',
    nameJa: '金貸し',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'moneylender' },
  },
  Poacher: {
    name: 'Poacher',
    nameJa: '密猟者',
    cost: 4,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, coins: 1, custom: 'poacher' },
  },
  Remodel: {
    name: 'Remodel',
    nameJa: '改築',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'remodel' },
  },
  Smithy: {
    name: 'Smithy',
    nameJa: '鍛冶屋',
    cost: 4,
    types: [CardType.Action],
    effects: { cards: 3 },
  },
  'Throne Room': {
    name: 'Throne Room',
    nameJa: '玉座の間',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'throneRoom' },
  },
  Bandit: {
    name: 'Bandit',
    nameJa: '山賊',
    cost: 5,
    types: [CardType.Action, CardType.Attack],
    effects: { custom: 'bandit' },
  },
  'Council Room': {
    name: 'Council Room',
    nameJa: '議事堂',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 4, buys: 1, custom: 'councilRoom' },
  },
  Festival: {
    name: 'Festival',
    nameJa: '祝祭',
    cost: 5,
    types: [CardType.Action],
    effects: { actions: 2, buys: 1, coins: 2 },
  },
  Laboratory: {
    name: 'Laboratory',
    nameJa: '研究所',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 2, actions: 1 },
  },
  Library: {
    name: 'Library',
    nameJa: '書庫',
    cost: 5,
    types: [CardType.Action],
    effects: { custom: 'library' },
  },
  Market: {
    name: 'Market',
    nameJa: '市場',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, buys: 1, coins: 1 },
  },
  Mine: {
    name: 'Mine',
    nameJa: '鉱山',
    cost: 5,
    types: [CardType.Action],
    effects: { custom: 'mine' },
  },
  Sentry: {
    name: 'Sentry',
    nameJa: '歩哨',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'sentry' },
  },
  Witch: {
    name: 'Witch',
    nameJa: '魔女',
    cost: 5,
    types: [CardType.Action, CardType.Attack],
    effects: { cards: 2, custom: 'witch' },
  },
  Artisan: {
    name: 'Artisan',
    nameJa: '職人',
    cost: 6,
    types: [CardType.Action],
    effects: { custom: 'artisan' },
  },
};

export function getCardDef(name: string): CardDef {
  const def = CARD_DEFS[name];
  if (!def) {
    const available = Object.keys(CARD_DEFS).join(', ');
    throw new Error(
      `Unknown card: "${name}". Available cards: ${available}`,
    );
  }
  return def;
}

export function createCardInstance(cardDef: CardDef): CardInstance {
  return {
    instanceId: crypto.randomUUID(),
    def: cardDef,
  };
}
