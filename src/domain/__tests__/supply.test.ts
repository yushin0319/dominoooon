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
  describe("2-player game", () => {
    const supply = initializeSupply(kingdom, 2);

    it("has Copper: 60 - 14 = 46", () => {
      expect(pile(supply, "Copper")?.count).toBe(46);
    });

    it("has Silver: 40", () => {
      expect(pile(supply, "Silver")?.count).toBe(40);
    });

    it("has Gold: 30", () => {
      expect(pile(supply, "Gold")?.count).toBe(30);
    });

    it("has Estate: 8 (2 players)", () => {
      expect(pile(supply, "Estate")?.count).toBe(8);
    });

    it("has Duchy: 8 (2 players)", () => {
      expect(pile(supply, "Duchy")?.count).toBe(8);
    });

    it("has Province: 8 (2 players)", () => {
      expect(pile(supply, "Province")?.count).toBe(8);
    });

    it("has Curse: 10 (2 players)", () => {
      expect(pile(supply, "Curse")?.count).toBe(10);
    });

    it("has non-Victory kingdom cards at 10 each", () => {
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

    it("has Gardens (Victory kingdom) at 8 (2 players)", () => {
      expect(pile(supply, "Gardens")?.count).toBe(8);
    });

    it("contains all 17 piles (7 basic + 10 kingdom)", () => {
      expect(supply).toHaveLength(17);
    });
  });

  describe("3-player game", () => {
    const supply = initializeSupply(kingdom, 3);

    it("has Copper: 60 - 21 = 39", () => {
      expect(pile(supply, "Copper")?.count).toBe(39);
    });

    it("has Estate: 12 (3 players)", () => {
      expect(pile(supply, "Estate")?.count).toBe(12);
    });

    it("has Duchy: 12 (3 players)", () => {
      expect(pile(supply, "Duchy")?.count).toBe(12);
    });

    it("has Province: 12 (3 players)", () => {
      expect(pile(supply, "Province")?.count).toBe(12);
    });

    it("has Curse: 20 (3 players)", () => {
      expect(pile(supply, "Curse")?.count).toBe(20);
    });

    it("has Gardens at 12 (3 players)", () => {
      expect(pile(supply, "Gardens")?.count).toBe(12);
    });
  });

  describe("4-player game", () => {
    const supply = initializeSupply(kingdom, 4);

    it("has Copper: 60 - 28 = 32", () => {
      expect(pile(supply, "Copper")?.count).toBe(32);
    });

    it("has Estate: 12 (4 players)", () => {
      expect(pile(supply, "Estate")?.count).toBe(12);
    });

    it("has Province: 12 (4 players)", () => {
      expect(pile(supply, "Province")?.count).toBe(12);
    });

    it("has Curse: 30 (4 players)", () => {
      expect(pile(supply, "Curse")?.count).toBe(30);
    });

    it("has Gardens at 12 (4 players)", () => {
      expect(pile(supply, "Gardens")?.count).toBe(12);
    });
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
