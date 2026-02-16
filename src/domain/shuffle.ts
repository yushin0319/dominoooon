import type { CardInstance, ShuffleFn } from "../types";

/**
 * Design Decision: Shuffle Dependency Injection
 *
 * This module uses DI pattern for testability:
 * - Production: Uses cryptoRandom() with crypto.getRandomValues() for secure RNG
 * - Tests: Can inject deterministic RNG (e.g., seeded Math.random) for reproducible tests
 *
 * While this adds abstraction, it's essential for unit testing card game logic
 * where deterministic shuffles are needed to verify specific game scenarios.
 */

/**
 * Cryptographically secure random number generator.
 * Returns a random number in [0, 1) using crypto.getRandomValues().
 */
function cryptoRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

/**
 * Fisher-Yates (Knuth) shuffle.
 * Returns a new shuffled array without mutating the original.
 *
 * @param array  - The array of CardInstance to shuffle
 * @param rng    - Optional random number generator returning [0, 1). Defaults to cryptoRandom.
 */
export function fisherYatesShuffle(
  array: CardInstance[],
  rng: () => number = cryptoRandom,
): CardInstance[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Factory that returns a ShuffleFn.
 *
 * @param rng - Optional custom RNG. If omitted, uses cryptoRandom.
 */
export function createShuffleFn(rng?: () => number): ShuffleFn {
  return (array: CardInstance[]) => fisherYatesShuffle(array, rng);
}
