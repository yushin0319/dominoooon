// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  initializeSupply,
  takeFromSupply,
  getSupplyPile,
  isGameOver,
  getEmptyPileCount,
  getAvailableCards,
} from "../supply";
import { CARD_DEFS } from "../card";
import type { SupplyPile } from "../../types";

const kingdom = [
  CARD_DEFS.Village,
  CARD_DEFS.Smithy,
  CARD_DEFS.Market,
  CARD_DEFS.Laboratory,
  CARD_DEFS.Festival,
  CARD_DEFS.Gardens,
  CARD_DEFS.Cellar,
  CARD_DEFS.Workshop,
  CARD_DEFS.Militia,
  CARD_DEFS.Mine,
];

// Helper to find a pile by name
function pile(supply: SupplyPile[], name: string) {
  return supply.find((p) => p.card.name === name);
}

describe("initializeSupply", () => {
  // プレイヤー数によって変わるパイル初期枚数をパラメータ化して検証する
  it.each([
    { playerCount: 2, copper: 46, estate: 8, duchy: 8, province: 8, curse: 10, gardens: 8 },
    { playerCount: 3, copper: 39, estate: 12, duchy: 12, province: 12, curse: 20, gardens: 12 },
    { playerCount: 4, copper: 32, estate: 12, duchy: 12, province: 12, curse: 30, gardens: 12 },
  ])(
    "$playerCount-player game initializes variable pile counts correctly",
    ({ playerCount, copper, estate, duchy, province, curse, gardens }) => {
      const supply = initializeSupply(kingdom, playerCount);
      expect(pile(supply, "Copper")?.count).toBe(copper);
      expect(pile(supply, "Estate")?.count).toBe(estate);
      expect(pile(supply, "Duchy")?.count).toBe(duchy);
      expect(pile(supply, "Province")?.count).toBe(province);
      expect(pile(supply, "Curse")?.count).toBe(curse);
      expect(pile(supply, "Gardens")?.count).toBe(gardens);
    },
  );

  it("Silver and Gold counts are always fixed (40 and 30)", () => {
    const supply = initializeSupply(kingdom, 2);
    expect(pile(supply, "Silver")?.count).toBe(40);
    expect(pile(supply, "Gold")?.count).toBe(30);
  });

  it("non-Victory kingdom cards start at 10 each", () => {
    const supply = initializeSupply(kingdom, 2);
    for (const name of [
      "Village",
      "Smithy",
      "Market",
      "Laboratory",
      "Festival",
      "Cellar",
      "Workshop",
      "Militia",
      "Mine",
    ]) {
      expect(pile(supply, name)?.count).toBe(10);
    }
  });

  it("contains all 17 piles (7 basic + 10 kingdom)", () => {
    const supply = initializeSupply(kingdom, 2);
    expect(supply).toHaveLength(17);
  });
});

describe("takeFromSupply", () => {
  it("returns the updated supply and the card", () => {
    const supply = initializeSupply(kingdom, 2);
    const [newSupply, card] = takeFromSupply(supply, "Silver");
    expect(card.name).toBe("Silver");
    expect(pile(newSupply, "Silver")?.count).toBe(39);
  });

  it("does not mutate the original supply", () => {
    const supply = initializeSupply(kingdom, 2);
    const originalCount = pile(supply, "Silver")!.count;
    takeFromSupply(supply, "Silver");
    expect(pile(supply, "Silver")?.count).toBe(originalCount);
  });

  it("throws when pile is empty", () => {
    // Create a supply with Province at 0
    const supply = initializeSupply(kingdom, 2).map((p) =>
      p.card.name === "Province" ? { ...p, count: 0 } : p,
    );
    expect(() => takeFromSupply(supply, "Province")).toThrow();
  });

  it("throws when card name is not in supply", () => {
    const supply = initializeSupply(kingdom, 2);
    expect(() => takeFromSupply(supply, "NonExistent")).toThrow();
  });
});

describe("getSupplyPile", () => {
  const supply = initializeSupply(kingdom, 2);

  it("returns the pile for an existing card", () => {
    const p = getSupplyPile(supply, "Gold");
    expect(p).toBeDefined();
    expect(p!.card.name).toBe("Gold");
    expect(p!.count).toBe(30);
  });

  it("returns undefined for a non-existing card", () => {
    expect(getSupplyPile(supply, "NonExistent")).toBeUndefined();
  });
});

describe("isGameOver", () => {
  it("returns true when Province pile is empty", () => {
    const supply = initializeSupply(kingdom, 2).map((p) =>
      p.card.name === "Province" ? { ...p, count: 0 } : p,
    );
    expect(isGameOver(supply)).toBe(true);
  });

  it("returns true when 3 piles are empty", () => {
    let emptyCount = 0;
    const supply = initializeSupply(kingdom, 2).map((p) => {
      if (emptyCount < 3 && p.card.name !== "Province") {
        emptyCount++;
        return { ...p, count: 0 };
      }
      return p;
    });
    expect(isGameOver(supply)).toBe(true);
  });

  it("returns false when only 2 non-Province piles are empty", () => {
    let emptyCount = 0;
    const supply = initializeSupply(kingdom, 2).map((p) => {
      if (emptyCount < 2 && p.card.name !== "Province") {
        emptyCount++;
        return { ...p, count: 0 };
      }
      return p;
    });
    expect(isGameOver(supply)).toBe(false);
  });

  it("returns false when all piles have cards", () => {
    const supply = initializeSupply(kingdom, 2);
    expect(isGameOver(supply)).toBe(false);
  });
});

describe("getEmptyPileCount", () => {
  it("returns 0 when no piles are empty", () => {
    const supply = initializeSupply(kingdom, 2);
    expect(getEmptyPileCount(supply)).toBe(0);
  });

  it("counts empty piles correctly", () => {
    let emptyCount = 0;
    const supply = initializeSupply(kingdom, 2).map((p) => {
      if (emptyCount < 4) {
        emptyCount++;
        return { ...p, count: 0 };
      }
      return p;
    });
    expect(getEmptyPileCount(supply)).toBe(4);
  });
});

describe("getAvailableCards", () => {
  const supply = initializeSupply(kingdom, 2);

  it("returns cards with cost <= maxCost", () => {
    const available = getAvailableCards(supply, 3);
    for (const card of available) {
      expect(card.cost).toBeLessThanOrEqual(3);
    }
    // Should include Copper(0), Curse(0), Estate(2), Cellar(2), Village(3), etc.
    expect(available.length).toBeGreaterThan(0);
  });

  it("excludes empty piles", () => {
    const modified = supply.map((p) =>
      p.card.name === "Copper" ? { ...p, count: 0 } : p,
    );
    const available = getAvailableCards(modified, 10);
    expect(available.find((c) => c.name === "Copper")).toBeUndefined();
  });

  it("returns empty array when no cards are affordable", () => {
    const available = getAvailableCards(supply, -1);
    expect(available).toEqual([]);
  });

  it("includes all non-empty piles when maxCost is high", () => {
    const available = getAvailableCards(supply, 100);
    expect(available).toHaveLength(supply.length);
  });
});
