/**
 * Weight rules for Node E breakdown (BRD 2 Rule 2 / US 1.3).
 *
 * The BRD is internally inconsistent here: it asks for an equal split of 3 tasks
 * as 33.33% each AND for the total to be exactly 100%, but 33.33 × 3 = 99.99.
 * Resolution agreed with the user (Q1): split evenly at 2 decimal places and put
 * the leftover on the LAST task, so 3 tasks become 33.33 / 33.33 / 33.34.
 */
export const TOTAL_WEIGHT = 100;

/** Weights are stored with 2 decimals; compare in integer hundredths to dodge float error. */
const toHundredths = (value: number) => Math.round(value * 100);

export function distributeWeights(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(TOTAL_WEIGHT * 100 / count) / 100; // floor to 2dp
  const weights = Array.from({ length: count }, () => base);
  const distributed = toHundredths(base) * count;
  const remainder = toHundredths(TOTAL_WEIGHT) - distributed;
  weights[count - 1] = (toHundredths(base) + remainder) / 100;
  return weights;
}

export function sumWeights(weights: number[]): number {
  return weights.reduce((sum, w) => sum + toHundredths(w), 0) / 100;
}

/** True when the weights add up to exactly 100.00 (US 1.3 AC2). */
export function isTotalExact(weights: number[]): boolean {
  return weights.reduce((sum, w) => sum + toHundredths(w), 0) === toHundredths(TOTAL_WEIGHT);
}
