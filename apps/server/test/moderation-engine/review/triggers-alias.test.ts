import { describe, expect, it } from "vitest";
import { createTaskAliasTable } from "../../../src/modules/moderation-engine/review/author-alias.js";
import {
  decideReviewTrigger,
  resolveReviewPolicy,
  ReviewConfigError,
} from "../../../src/modules/moderation-engine/review/triggers.js";

const POLICY = resolveReviewPolicy({ periodMs: 60_000, countThreshold: 5, maxPerCycle: 10 });
const T0 = Date.parse("2026-11-11T07:00:00.000Z");

describe("review triggers", () => {
  it("starts no cycle when nothing is waiting, even at the end of a stream", () => {
    expect(decideReviewTrigger({ nowMs: T0, lastCycleMs: null, openCount: 0, streamEnded: true }, POLICY)).toBeNull();
  });

  it("starts a cycle at the end of a stream before the count and the period", () => {
    expect(decideReviewTrigger({ nowMs: T0, lastCycleMs: T0, openCount: 9, streamEnded: true }, POLICY)).toBe("STREAM_END");
  });

  it("starts a cycle when the open count reaches the threshold, before the period is due", () => {
    expect(decideReviewTrigger({ nowMs: T0, lastCycleMs: T0, openCount: 5, streamEnded: false }, POLICY)).toBe("COUNT");
    expect(decideReviewTrigger({ nowMs: T0, lastCycleMs: T0, openCount: 4, streamEnded: false }, POLICY)).toBeNull();
  });

  it("starts the first cycle at once and later cycles only when the period is due", () => {
    expect(decideReviewTrigger({ nowMs: T0, lastCycleMs: null, openCount: 1, streamEnded: false }, POLICY)).toBe("PERIOD");
    expect(decideReviewTrigger({ nowMs: T0 + 59_999, lastCycleMs: T0, openCount: 1, streamEnded: false }, POLICY)).toBeNull();
    expect(decideReviewTrigger({ nowMs: T0 + 60_000, lastCycleMs: T0, openCount: 1, streamEnded: false }, POLICY)).toBe("PERIOD");
  });

  it("refuses a setting that is not a positive whole number", () => {
    expect(() => resolveReviewPolicy({ periodMs: 0 })).toThrow(ReviewConfigError);
    expect(() => resolveReviewPolicy({ countThreshold: 1.5 })).toThrow("REVIEW_CONFIG_INVALID: countThreshold");
    expect(() => resolveReviewPolicy({ maxPerCycle: -1 })).toThrow("REVIEW_CONFIG_INVALID: maxPerCycle");
  });
});

describe("task author aliases", () => {
  it("gives one author one alias within a task, and a different alias to each author", () => {
    const table = createTaskAliasTable("n1");
    const first = table.aliasFor("ch-1/viewer-a");
    expect(table.aliasFor("ch-1/viewer-a")).toBe(first);
    expect(table.aliasFor("ch-1/viewer-b")).not.toBe(first);
  });

  it("gives the same author a different alias in another task", () => {
    const one = createTaskAliasTable("n1").aliasFor("ch-1/viewer-a");
    const two = createTaskAliasTable("n2").aliasFor("ch-1/viewer-a");
    expect(one).not.toBe(two);
  });

  it("never contains the sender reference", () => {
    const alias = createTaskAliasTable("n1").aliasFor("ch-1/viewer-secret-42");
    expect(alias).not.toContain("viewer-secret-42");
    expect(alias).not.toContain("ch-1");
  });

  it("refuses an empty nonce", () => {
    expect(() => createTaskAliasTable("  ")).toThrow("TASK_ALIAS_NONCE_INVALID");
  });
});
