import { describe, expect, it } from "vitest";
import { indexOfLog, selectionAfterStep } from "../CorrelationChain";

/*
 * VW-SUB032-AC001 (navigation): previous, next and direct selection move through the whole chain, and the selection
 * is kept by entry id. The functions take the full chain, so no step is limited to one page.
 */

const chain = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("chain navigation", () => {
  it("finds an entry by its id, and reports an absent id as -1", () => {
    expect(indexOfLog(chain, "b")).toBe(1);
    expect(indexOfLog(chain, "gone")).toBe(-1);
    expect(indexOfLog(chain, null)).toBe(-1);
  });

  it("moves one entry in either direction, and stops at the first and the last", () => {
    expect(selectionAfterStep(chain, "b", "next")).toBe("c");
    expect(selectionAfterStep(chain, "b", "previous")).toBe("a");
    expect(selectionAfterStep(chain, "a", "previous")).toBeNull();
    expect(selectionAfterStep(chain, "c", "next")).toBeNull();
  });

  it("walks the whole chain from the first entry to the last, and back", () => {
    const forward: string[] = [];
    let current: string | null = "a";
    while (current !== null) {
      forward.push(current);
      current = selectionAfterStep(chain, current, "next");
    }
    expect(forward).toEqual(["a", "b", "c"]);

    const backward: string[] = [];
    current = "c";
    while (current !== null) {
      backward.push(current);
      current = selectionAfterStep(chain, current, "previous");
    }
    expect(backward).toEqual(["c", "b", "a"]);
  });

  it("walks a long chain without stopping at a page boundary", () => {
    const long = Array.from({ length: 250 }, (_, index) => ({ id: `log-${index}` }));
    let current: string | null = "log-0";
    let steps = 0;
    while (current !== null) {
      current = selectionAfterStep(long, current, "next");
      steps += 1;
    }
    expect(steps).toBe(250);
  });

  it("falls back to the first entry when the selection is not in the chain", () => {
    expect(selectionAfterStep(chain, "gone", "next")).toBe("a");
    expect(selectionAfterStep(chain, null, "previous")).toBe("a");
  });

  it("has no step in an empty chain", () => {
    expect(selectionAfterStep([], null, "next")).toBeNull();
    expect(selectionAfterStep([], "a", "previous")).toBeNull();
  });
});
