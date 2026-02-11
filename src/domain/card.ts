import { CardDef, CardType, CardInstance, PlayerState } from '../types';

export const CARD_DEFS: Record<string, CardDef> = {
  // ===== Treasure (3) =====
  Copper: {
    name: 'Copper',
    cost: 0,
    types: [CardType.Treasure],
    effects: { coins: 1 },
  },
  Silver: {
    name: 'Silver',
    cost: 3,
    types: [CardType.Treasure],
    effects: { coins: 2 },
  },
  Gold: {
    name: 'Gold',
    cost: 6,
    types: [CardType.Treasure],
    effects: { coins: 3 },
  },

  // ===== Victory (3) =====
  Estate: {
    name: 'Estate',
    cost: 2,
    types: [CardType.Victory],
    effects: {},
    vpValue: 1,
  },
  Duchy: {
    name: 'Duchy',
    cost: 5,
    types: [CardType.Victory],
    effects: {},
    vpValue: 3,
  },
  Province: {
    name: 'Province',
    cost: 8,
    types: [CardType.Victory],
    effects: {},
    vpValue: 6,
  },

  // ===== Curse (1) =====
  Curse: {
    name: 'Curse',
    cost: 0,
    types: [CardType.Curse],
    effects: {},
    vpValue: -1,
  },

  // ===== Kingdom (26) =====
  Cellar: {
    name: 'Cellar',
    cost: 2,
    types: [CardType.Action],
    effects: { actions: 1, custom: 'cellar' },
  },
  Chapel: {
    name: 'Chapel',
    cost: 2,
    types: [CardType.Action],
    effects: { custom: 'chapel' },
  },
  Moat: {
    name: 'Moat',
    cost: 2,
    types: [CardType.Action, CardType.Reaction],
    effects: { cards: 2 },
  },
  Harbinger: {
    name: 'Harbinger',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'harbinger' },
  },
  Merchant: {
    name: 'Merchant',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'merchant' },
  },
  Vassal: {
    name: 'Vassal',
    cost: 3,
    types: [CardType.Action],
    effects: { coins: 2, custom: 'vassal' },
  },
  Village: {
    name: 'Village',
    cost: 3,
    types: [CardType.Action],
    effects: { cards: 1, actions: 2 },
  },
  Workshop: {
    name: 'Workshop',
    cost: 3,
    types: [CardType.Action],
    effects: { custom: 'workshop' },
  },
  Bureaucrat: {
    name: 'Bureaucrat',
    cost: 4,
    types: [CardType.Action, CardType.Attack],
    effects: { custom: 'bureaucrat' },
  },
  Gardens: {
    name: 'Gardens',
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
    cost: 4,
    types: [CardType.Action, CardType.Attack],
    effects: { coins: 2, custom: 'militia' },
  },
  Moneylender: {
    name: 'Moneylender',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'moneylender' },
  },
  Poacher: {
    name: 'Poacher',
    cost: 4,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, coins: 1, custom: 'poacher' },
  },
  Remodel: {
    name: 'Remodel',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'remodel' },
  },
  Smithy: {
    name: 'Smithy',
    cost: 4,
    types: [CardType.Action],
    effects: { cards: 3 },
  },
  'Throne Room': {
    name: 'Throne Room',
    cost: 4,
    types: [CardType.Action],
    effects: { custom: 'throneRoom' },
  },
  Bandit: {
    name: 'Bandit',
    cost: 5,
    types: [CardType.Action, CardType.Attack],
    effects: { custom: 'bandit' },
  },
  'Council Room': {
    name: 'Council Room',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 4, buys: 1, custom: 'councilRoom' },
  },
  Festival: {
    name: 'Festival',
    cost: 5,
    types: [CardType.Action],
    effects: { actions: 2, buys: 1, coins: 2 },
  },
  Laboratory: {
    name: 'Laboratory',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 2, actions: 1 },
  },
  Library: {
    name: 'Library',
    cost: 5,
    types: [CardType.Action],
    effects: { custom: 'library' },
  },
  Market: {
    name: 'Market',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, buys: 1, coins: 1 },
  },
  Mine: {
    name: 'Mine',
    cost: 5,
    types: [CardType.Action],
    effects: { custom: 'mine' },
  },
  Sentry: {
    name: 'Sentry',
    cost: 5,
    types: [CardType.Action],
    effects: { cards: 1, actions: 1, custom: 'sentry' },
  },
  Witch: {
    name: 'Witch',
    cost: 5,
    types: [CardType.Action, CardType.Attack],
    effects: { cards: 2, custom: 'witch' },
  },
  Artisan: {
    name: 'Artisan',
    cost: 6,
    types: [CardType.Action],
    effects: { custom: 'artisan' },
  },
};

export function getCardDef(name: string): CardDef {
  const def = CARD_DEFS[name];
  if (!def) {
    throw new Error(`Unknown card: ${name}`);
  }
  return def;
}

export function createCardInstance(cardDef: CardDef): CardInstance {
  return {
    instanceId: crypto.randomUUID(),
    def: cardDef,
  };
}
