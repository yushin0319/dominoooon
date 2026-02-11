import { describe, it, expect } from 'vitest';
import { CARD_DEFS, getCardDef, createCardInstance } from '../card';
import { CardType } from '../../types';
import type { PlayerState } from '../../types';

describe('CARD_DEFS', () => {
  it('should contain exactly 33 cards', () => {
    expect(Object.keys(CARD_DEFS)).toHaveLength(33);
  });

  it('each card name should match its key', () => {
    for (const [key, card] of Object.entries(CARD_DEFS)) {
      expect(card.name).toBe(key);
    }
  });
});

describe('Treasure cards', () => {
  it('Copper: cost 0, coins 1', () => {
    const copper = CARD_DEFS['Copper'];
    expect(copper.cost).toBe(0);
    expect(copper.effects.coins).toBe(1);
    expect(copper.types).toEqual([CardType.Treasure]);
  });

  it('Silver: cost 3, coins 2', () => {
    const silver = CARD_DEFS['Silver'];
    expect(silver.cost).toBe(3);
    expect(silver.effects.coins).toBe(2);
    expect(silver.types).toEqual([CardType.Treasure]);
  });

  it('Gold: cost 6, coins 3', () => {
    const gold = CARD_DEFS['Gold'];
    expect(gold.cost).toBe(6);
    expect(gold.effects.coins).toBe(3);
    expect(gold.types).toEqual([CardType.Treasure]);
  });
});

describe('Victory cards', () => {
  it('Estate: cost 2, vpValue 1', () => {
    const estate = CARD_DEFS['Estate'];
    expect(estate.cost).toBe(2);
    expect(estate.vpValue).toBe(1);
    expect(estate.types).toEqual([CardType.Victory]);
  });

  it('Duchy: cost 5, vpValue 3', () => {
    const duchy = CARD_DEFS['Duchy'];
    expect(duchy.cost).toBe(5);
    expect(duchy.vpValue).toBe(3);
    expect(duchy.types).toEqual([CardType.Victory]);
  });

  it('Province: cost 8, vpValue 6', () => {
    const province = CARD_DEFS['Province'];
    expect(province.cost).toBe(8);
    expect(province.vpValue).toBe(6);
    expect(province.types).toEqual([CardType.Victory]);
  });
});

describe('Curse card', () => {
  it('Curse: cost 0, vpValue -1', () => {
    const curse = CARD_DEFS['Curse'];
    expect(curse.cost).toBe(0);
    expect(curse.vpValue).toBe(-1);
    expect(curse.types).toEqual([CardType.Curse]);
  });
});

describe('Gardens', () => {
  it('should have Victory type and vpCalculator', () => {
    const gardens = CARD_DEFS['Gardens'];
    expect(gardens.types).toEqual([CardType.Victory]);
    expect(gardens.vpCalculator).toBeDefined();
    expect(gardens.vpValue).toBeUndefined();
  });

  it('vpCalculator returns 1 VP per 10 cards (floor)', () => {
    const gardens = CARD_DEFS['Gardens'];
    const makePlayer = (totalCards: number): PlayerState => ({
      id: 'test',
      name: 'Test',
      deck: Array(totalCards).fill(null) as any,
      hand: [],
      discard: [],
      playArea: [],
    });

    expect(gardens.vpCalculator!(makePlayer(0))).toBe(0);
    expect(gardens.vpCalculator!(makePlayer(9))).toBe(0);
    expect(gardens.vpCalculator!(makePlayer(10))).toBe(1);
    expect(gardens.vpCalculator!(makePlayer(15))).toBe(1);
    expect(gardens.vpCalculator!(makePlayer(20))).toBe(2);
    expect(gardens.vpCalculator!(makePlayer(30))).toBe(3);
  });
});

describe('Action cards - effects', () => {
  it('Village: +1 card, +2 actions', () => {
    const village = CARD_DEFS['Village'];
    expect(village.effects.cards).toBe(1);
    expect(village.effects.actions).toBe(2);
    expect(village.types).toEqual([CardType.Action]);
  });

  it('Smithy: +3 cards', () => {
    const smithy = CARD_DEFS['Smithy'];
    expect(smithy.effects.cards).toBe(3);
    expect(smithy.types).toEqual([CardType.Action]);
  });

  it('Laboratory: +2 cards, +1 action', () => {
    const lab = CARD_DEFS['Laboratory'];
    expect(lab.effects.cards).toBe(2);
    expect(lab.effects.actions).toBe(1);
    expect(lab.types).toEqual([CardType.Action]);
  });

  it('Market: +1 card, +1 action, +1 buy, +1 coin', () => {
    const market = CARD_DEFS['Market'];
    expect(market.effects.cards).toBe(1);
    expect(market.effects.actions).toBe(1);
    expect(market.effects.buys).toBe(1);
    expect(market.effects.coins).toBe(1);
    expect(market.types).toEqual([CardType.Action]);
  });

  it('Festival: +2 actions, +1 buy, +2 coins', () => {
    const festival = CARD_DEFS['Festival'];
    expect(festival.effects.actions).toBe(2);
    expect(festival.effects.buys).toBe(1);
    expect(festival.effects.coins).toBe(2);
    expect(festival.types).toEqual([CardType.Action]);
  });

  it('Council Room: +4 cards, +1 buy', () => {
    const cr = CARD_DEFS['Council Room'];
    expect(cr.effects.cards).toBe(4);
    expect(cr.effects.buys).toBe(1);
    expect(cr.types).toEqual([CardType.Action]);
  });
});

describe('Attack and Reaction types', () => {
  it('Moat has Action and Reaction types', () => {
    const moat = CARD_DEFS['Moat'];
    expect(moat.types).toEqual([CardType.Action, CardType.Reaction]);
  });

  it('Militia has Action and Attack types', () => {
    const militia = CARD_DEFS['Militia'];
    expect(militia.types).toEqual([CardType.Action, CardType.Attack]);
  });

  it('Bureaucrat has Action and Attack types', () => {
    const bureaucrat = CARD_DEFS['Bureaucrat'];
    expect(bureaucrat.types).toEqual([CardType.Action, CardType.Attack]);
  });

  it('Bandit has Action and Attack types', () => {
    const bandit = CARD_DEFS['Bandit'];
    expect(bandit.types).toEqual([CardType.Action, CardType.Attack]);
  });

  it('Witch has Action and Attack types', () => {
    const witch = CARD_DEFS['Witch'];
    expect(witch.types).toEqual([CardType.Action, CardType.Attack]);
  });
});

describe('getCardDef', () => {
  it('returns correct card for valid name', () => {
    const copper = getCardDef('Copper');
    expect(copper.name).toBe('Copper');
    expect(copper.cost).toBe(0);
  });

  it('throws for unknown card name', () => {
    expect(() => getCardDef('NonExistent')).toThrow();
  });
});

describe('createCardInstance', () => {
  it('creates instance with unique instanceId', () => {
    const copperDef = getCardDef('Copper');
    const inst1 = createCardInstance(copperDef);
    const inst2 = createCardInstance(copperDef);

    expect(inst1.instanceId).toBeTruthy();
    expect(inst2.instanceId).toBeTruthy();
    expect(inst1.instanceId).not.toBe(inst2.instanceId);
    expect(inst1.def).toBe(copperDef);
  });
});
