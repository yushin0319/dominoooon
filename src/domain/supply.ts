import type { SupplyPile, CardDef, CardType } from '../types';
import { CARD_DEFS } from './card';

/** Number of victory/curse cards based on player count */
function victoryCount(numPlayers: number): number {
  return numPlayers === 2 ? 8 : 12;
}

function curseCount(numPlayers: number): number {
  return (numPlayers - 1) * 10;
}

function hasType(card: CardDef, type: string): boolean {
  return card.types.includes(type as CardType);
}

/**
 * Initialize the supply for a game.
 */
export function initializeSupply(
  kingdomCards: CardDef[],
  numPlayers: number,
): SupplyPile[] {
  const vp = victoryCount(numPlayers);

  const basicPiles: SupplyPile[] = [
    { card: CARD_DEFS.Copper, count: 60 - 7 * numPlayers },
    { card: CARD_DEFS.Silver, count: 40 },
    { card: CARD_DEFS.Gold, count: 30 },
    { card: CARD_DEFS.Estate, count: vp },
    { card: CARD_DEFS.Duchy, count: vp },
    { card: CARD_DEFS.Province, count: vp },
    { card: CARD_DEFS.Curse, count: curseCount(numPlayers) },
  ];

  const kingdomPiles: SupplyPile[] = kingdomCards.map((card) => ({
    card,
    count: hasType(card, 'Victory') ? vp : 10,
  }));

  return [...basicPiles, ...kingdomPiles];
}

/**
 * Take one card from a supply pile. Returns a new supply and the taken CardDef.
 */
export function takeFromSupply(
  supply: SupplyPile[],
  cardName: string,
): [SupplyPile[], CardDef] {
  const pileIndex = supply.findIndex((p) => p.card.name === cardName);
  if (pileIndex === -1) {
    throw new Error(`Card not found in supply: ${cardName}`);
  }
  const target = supply[pileIndex];
  if (target.count <= 0) {
    throw new Error(`Supply pile is empty: ${cardName}`);
  }

  const newSupply = supply.map((p, i) =>
    i === pileIndex ? { ...p, count: p.count - 1 } : p,
  );
  return [newSupply, target.card];
}

/**
 * Find a supply pile by card name.
 */
export function getSupplyPile(
  supply: SupplyPile[],
  cardName: string,
): SupplyPile | undefined {
  return supply.find((p) => p.card.name === cardName);
}

/**
 * Check if the game is over (Province empty or 3+ empty piles).
 */
export function isGameOver(supply: SupplyPile[]): boolean {
  const provincePile = getSupplyPile(supply, 'Province');
  if (provincePile && provincePile.count === 0) return true;
  return getEmptyPileCount(supply) >= 3;
}

/**
 * Count the number of empty supply piles.
 */
export function getEmptyPileCount(supply: SupplyPile[]): number {
  return supply.filter((p) => p.count === 0).length;
}

/**
 * Get all available cards that can be gained/bought within a cost limit.
 */
export function getAvailableCards(
  supply: SupplyPile[],
  maxCost: number,
): CardDef[] {
  return supply
    .filter((p) => p.count > 0 && p.card.cost <= maxCost)
    .map((p) => p.card);
}
