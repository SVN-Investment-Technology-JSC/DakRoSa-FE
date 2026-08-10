import { distributeWeights, isTotalExact, sumWeights } from './weights';

describe('Node E weight distribution (BRD 2 Rule 2 / US 1.3)', () => {
  it('splits 4 tasks into a clean 25% each', () => {
    expect(distributeWeights(4)).toEqual([25, 25, 25, 25]);
  });

  it('resolves the BRD\'s own 33.33 × 3 = 99.99 contradiction by loading the last task', () => {
    // The BRD asks for "33.33% each" and "exactly 100%" at the same time.
    expect(distributeWeights(3)).toEqual([33.33, 33.33, 33.34]);
    expect(isTotalExact(distributeWeights(3))).toBe(true);
  });

  it('always totals exactly 100 for any count', () => {
    for (let n = 1; n <= 40; n++) {
      const weights = distributeWeights(n);
      expect(weights).toHaveLength(n);
      expect(isTotalExact(weights)).toBe(true);
    }
  });

  it('never emits a negative or zero weight for reasonable counts', () => {
    for (let n = 1; n <= 100; n++) {
      expect(distributeWeights(n).every((w) => w > 0)).toBe(true);
    }
  });

  it('handles the degenerate counts', () => {
    expect(distributeWeights(1)).toEqual([100]);
    expect(distributeWeights(0)).toEqual([]);
  });

  it('rejects manual weights that do not total 100', () => {
    expect(isTotalExact([50, 49.99])).toBe(false);
    expect(isTotalExact([50, 50.01])).toBe(false);
    expect(isTotalExact([60, 40])).toBe(true);
  });

  it('is immune to binary floating point drift', () => {
    // 0.1 + 0.2 !== 0.3 in IEEE-754; comparing in hundredths avoids that trap.
    expect(isTotalExact([0.1, 0.2, 99.7])).toBe(true);
    expect(sumWeights([0.1, 0.2, 99.7])).toBe(100);
  });
});
