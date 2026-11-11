import { describe, expect, it } from "vitest";
import { decideBatch, type BatchCandidate, type BatchLimits } from "../../src/modules/task-coordinator/micro-batch.js";
import { isExpired, parseDeadline } from "../../src/modules/task-coordinator/deadline.js";

const LIMITS: BatchLimits = { maxItems: 3, maxBytes: 100, maxWaitMs: 200, deadlineMarginMs: 1000 };
const NOW = 10_000;

function candidate(overrides: Partial<BatchCandidate> = {}): BatchCandidate {
  return { bytes: 10, enqueuedMs: NOW, deadlineMs: NOW + 60_000, ...overrides };
}

describe("decideBatch", () => {
  it("holds a young, short batch that is far from its deadline", () => {
    expect(decideBatch([candidate()], LIMITS, NOW)).toEqual({ kind: "hold" });
  });

  it("holds when nothing is waiting", () => {
    expect(decideBatch([], LIMITS, NOW)).toEqual({ kind: "hold" });
  });

  it("takes a full batch by item count and leaves the rest queued", () => {
    const candidates = [candidate(), candidate(), candidate(), candidate()];
    expect(decideBatch(candidates, LIMITS, NOW)).toEqual({ kind: "flush", count: 3, reason: "FULL" });
  });

  it("takes the batch before the item that would exceed the byte limit", () => {
    // 60 + 30 fits in 100. Adding 20 would make 110, so the batch stops at two items.
    const candidates = [candidate({ bytes: 60 }), candidate({ bytes: 30 }), candidate({ bytes: 20 })];
    expect(decideBatch(candidates, LIMITS, NOW)).toEqual({ kind: "flush", count: 2, reason: "BYTES" });
  });

  it("takes a small batch once its oldest item has waited long enough", () => {
    expect(decideBatch([candidate({ enqueuedMs: NOW - 200 })], LIMITS, NOW)).toEqual({
      kind: "flush",
      count: 1,
      reason: "WAIT",
    });
  });

  it("takes a small young batch when its earliest deadline is within the margin", () => {
    const urgent = candidate({ deadlineMs: NOW + 500 });
    expect(decideBatch([candidate(), urgent], LIMITS, NOW)).toEqual({ kind: "flush", count: 2, reason: "DEADLINE" });
  });
});

describe("deadline", () => {
  it("reads ISO timestamps and rejects other text", () => {
    expect(parseDeadline("2026-11-11T06:00:01.000Z")).toBe(Date.parse("2026-11-11T06:00:01.000Z"));
    expect(parseDeadline("not a time")).toBeNull();
  });

  it("counts a task as expired from the instant its deadline is reached", () => {
    expect(isExpired(100, 99)).toBe(false);
    expect(isExpired(100, 100)).toBe(true);
  });
});
