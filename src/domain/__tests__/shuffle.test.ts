// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  fisherYatesShuffle,
  createShuffleFn,
} from "../shuffle";
import type { CardInstance, CardDef, CardType, ShuffleFn } from "../../types";

// Helper: create a minimal CardInstance for testing
function makeCard(id: string): CardInstance {
  const def: CardDef = {
    name: `Card_${id}`,
    nameJa: `カード_${id}`,
    cost: 0,
    types: [] as CardType[],
    effects: {},
  };
  return { instanceId: id, def };
}

describe("fisherYatesShuffle", () => {
  it("returns an array of the same length", () => {
    const cards = [makeCard("1"), makeCard("2"), makeCard("3")];
    const result = fisherYatesShuffle(cards);
    expect(result).toHaveLength(cards.length);
  });

  it("preserves all elements", () => {
    const cards = [makeCard("a"), makeCard("b"), makeCard("c"), makeCard("d")];
    const result = fisherYatesShuffle(cards);
    const ids = result.map((c) => c.instanceId).sort();
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("handles an empty array without error", () => {
    const result = fisherYatesShuffle([]);
    expect(result).toEqual([]);
  });

  it("returns the single element for a 1-element array", () => {
    const cards = [makeCard("only")];
    const result = fisherYatesShuffle(cards);
    expect(result).toEqual(cards);
  });

  it("does not mutate the original array (immutability)", () => {
    const cards = [makeCard("1"), makeCard("2"), makeCard("3")];
    const original = [...cards];
    fisherYatesShuffle(cards);
    expect(cards).toEqual(original);
  });

  it("accepts a custom rng for deterministic shuffle", () => {
    const cards = [makeCard("1"), makeCard("2"), makeCard("3"), makeCard("4")];

    // Deterministic rng: always returns a fixed sequence
    let callCount = 0;
    const values = [0.1, 0.5, 0.9, 0.2];
    const deterministicRng = () => values[callCount++ % values.length];

    const result1 = fisherYatesShuffle(cards, deterministicRng);

    callCount = 0;
    const result2 = fisherYatesShuffle(cards, deterministicRng);

    expect(result1.map((c) => c.instanceId)).toEqual(
      result2.map((c) => c.instanceId),
    );
  });

  it("produces deterministic results with the same rng seed", () => {
    const cards = Array.from({ length: 10 }, (_, i) => makeCard(String(i)));

    // Simple seeded PRNG (linear congruential)
    function seededRng(seed: number) {
      let s = seed;
      return () => {
        s = (s * 1664525 + 1013904223) % 2 ** 32;
        return s / 2 ** 32;
      };
    }

    const result1 = fisherYatesShuffle(cards, seededRng(42));
    const result2 = fisherYatesShuffle(cards, seededRng(42));

    expect(result1.map((c) => c.instanceId)).toEqual(
      result2.map((c) => c.instanceId),
    );
  });
});

describe("createShuffleFn", () => {
  it("returns a function when called with no arguments (default crypto rng)", () => {
    const shuffleFn = createShuffleFn();
    expect(typeof shuffleFn).toBe("function");
  });

  it("returns a function when called with a custom rng", () => {
    const customRng = () => 0.5;
    const shuffleFn = createShuffleFn(customRng);
    expect(typeof shuffleFn).toBe("function");
  });

  it("returned function shuffles correctly", () => {
    const shuffleFn = createShuffleFn();
    const cards = [makeCard("a"), makeCard("b"), makeCard("c")];
    const result = shuffleFn(cards);
    expect(result).toHaveLength(3);
    const ids = result.map((c) => c.instanceId).sort();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("returned function conforms to ShuffleFn type", () => {
    const fn: ShuffleFn = createShuffleFn();
    const cards = [makeCard("x")];
    const result = fn(cards);
    expect(result).toHaveLength(1);
    expect(result[0].instanceId).toBe("x");
  });

  it("DI shuffle function produces deterministic results", () => {
    let callCount = 0;
    const values = [0.3, 0.7, 0.1, 0.9, 0.5];
    const deterministicRng = () => values[callCount++ % values.length];

    const shuffleFn = createShuffleFn(deterministicRng);
    const cards = [
      makeCard("1"),
      makeCard("2"),
      makeCard("3"),
      makeCard("4"),
      makeCard("5"),
    ];

    const result1 = shuffleFn(cards);

    callCount = 0;
    const result2 = shuffleFn(cards);

    expect(result1.map((c) => c.instanceId)).toEqual(
      result2.map((c) => c.instanceId),
    );
  });
});
