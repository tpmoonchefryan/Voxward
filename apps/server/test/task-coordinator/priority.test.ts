import { describe, expect, it } from "vitest";
import {
  backgroundCeiling,
  interactiveReserve,
  laneMayStart,
  TASK_LANES,
} from "../../src/modules/task-coordinator/priority.js";

describe("lane order", () => {
  it("dispatches paid review first, then real-time review, then background review", () => {
    expect([...TASK_LANES]).toEqual(["PAID", "REALTIME", "BACKGROUND"]);
  });
});

describe("background headroom", () => {
  it("keeps a quarter of the slots, and at least one, free for interactive work", () => {
    expect(interactiveReserve(1)).toBe(1);
    expect(interactiveReserve(4)).toBe(1);
    expect(interactiveReserve(8)).toBe(2);
  });

  it("caps background batches below the limit", () => {
    expect(backgroundCeiling(1)).toBe(0);
    expect(backgroundCeiling(4)).toBe(3);
    expect(backgroundCeiling(8)).toBe(6);
  });

  it("lets interactive lanes use every slot", () => {
    expect(laneMayStart("PAID", { total: 3, background: 0 }, 4)).toBe(true);
    expect(laneMayStart("REALTIME", { total: 3, background: 3 }, 4)).toBe(true);
  });

  it("stops background at its ceiling, and stops every lane when all slots are taken", () => {
    expect(laneMayStart("BACKGROUND", { total: 1, background: 0 }, 4)).toBe(true);
    expect(laneMayStart("BACKGROUND", { total: 3, background: 3 }, 4)).toBe(false);
    expect(laneMayStart("REALTIME", { total: 4, background: 0 }, 4)).toBe(false);
  });

  it("pauses background work at the minimum concurrency", () => {
    expect(laneMayStart("BACKGROUND", { total: 0, background: 0 }, 1)).toBe(false);
  });
});
