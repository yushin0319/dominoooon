import type { CardInstance, ShuffleFn } from "../types";

/**
 * Fisher-Yates (Knuth) shuffle.
 * Returns a new shuffled array without mutating the original.
 *
 * @param array  - The array of CardInstance to shuffle
 * @param rng    - Optional random number generator returning [0, 1). Defaults to Math.random.
 */
export function fisherYatesShuffle(
  array: CardInstance[],
  rng: () => number = Math.random,
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
 * @param rng - Optional custom RNG. If omitted, uses Math.random.
 */
export function createShuffleFn(rng?: () => number): ShuffleFn {
  return (array: CardInstance[]) => fisherYatesShuffle(array, rng);
}
