// 501, straight in, double out.

export type DartScoreResult =
  | { kind: 'continue'; remaining: number }
  | { kind: 'bust' }
  | { kind: 'checkout' };

/**
 * Apply one dart to the remaining score.
 * Bust when the score would go below 0, land on exactly 1, or reach 0 without a double.
 */
export function scoreDart(remaining: number, points: number, isDouble: boolean): DartScoreResult {
  const next = remaining - points;
  if (next < 0 || next === 1) return { kind: 'bust' };
  if (next === 0) return isDouble ? { kind: 'checkout' } : { kind: 'bust' };
  return { kind: 'continue', remaining: next };
}

/** The bogey numbers: no three-dart finish exists. */
export const BOGEY_NUMBERS = [169, 168, 166, 165, 163, 162, 159] as const;

/** Highest finish with a given number of darts (double out, bull counts as a double). */
export const MAX_CHECKOUT = { 1: 50, 2: 110, 3: 170 } as const;

const DOUBLE_VALUES = [...Array.from({ length: 20 }, (_, i) => (i + 1) * 2), 50];
const ANY_DART_VALUES = (() => {
  const s = new Set<number>();
  for (let n = 1; n <= 20; n++) [n, n * 2, n * 3].forEach((v) => s.add(v));
  s.add(25);
  s.add(50);
  return [...s];
})();

/** Can `score` be finished with at most `darts` darts? Exact, not table-based. */
export function canCheckout(score: number, darts: number): boolean {
  if (darts <= 0 || score < 2) return false;
  if (DOUBLE_VALUES.includes(score)) return true;
  if (darts === 1) return false;
  return ANY_DART_VALUES.some((v) => score - v >= 2 && canCheckout(score - v, darts - 1));
}

export function isBogey(score: number): boolean {
  return score <= 170 && score > 1 && !canCheckout(score, 3);
}
