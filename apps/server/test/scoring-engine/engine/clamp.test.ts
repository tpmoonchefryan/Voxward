import { describe, expect, it } from "vitest";
import { applyClampedDelta } from "../../../src/modules/scoring-engine/clamp.js";
import { seededRandom } from "../synthetic.js";

const BOUNDS = { minScore: -10, maxScore: 10 };

describe("applyClampedDelta", () => {
  it("applies the whole change while the score stays inside the range", () => {
    expect(applyClampedDelta(0, 5, BOUNDS)).toEqual({ nextScore: 5, actualDelta: 5 });
    expect(applyClampedDelta(4, -6, BOUNDS)).toEqual({ nextScore: -2, actualDelta: -6 });
  });

  it("counts only the part that fits when a change crosses the upper limit", () => {
    expect(applyClampedDelta(8, 5, BOUNDS)).toEqual({ nextScore: 10, actualDelta: 2 });
  });

  it("counts zero when the score is already at a limit", () => {
    expect(applyClampedDelta(10, 3, BOUNDS)).toEqual({ nextScore: 10, actualDelta: 0 });
    expect(applyClampedDelta(-10, -1, BOUNDS)).toEqual({ nextScore: -10, actualDelta: 0 });
  });

  it("counts only the part that fits at the lower limit", () => {
    expect(applyClampedDelta(-9, -5, BOUNDS)).toEqual({ nextScore: -10, actualDelta: -1 });
  });

  it("keeps the stored score inside the range and equal to the sum of the actual changes", () => {
    const random = seededRandom(7);
    let score = 0;
    let sumOfActual = 0;
    for (let step = 0; step < 500; step += 1) {
      const requested = Math.floor(random() * 11) - 5;
      const change = applyClampedDelta(score, requested, BOUNDS);
      expect(change.nextScore).toBeGreaterThanOrEqual(BOUNDS.minScore);
      expect(change.nextScore).toBeLessThanOrEqual(BOUNDS.maxScore);
      sumOfActual += change.actualDelta;
      score = change.nextScore;
    }
    expect(sumOfActual).toBe(score);
  });
});
