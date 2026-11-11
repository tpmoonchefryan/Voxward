import { describe, expect, it } from "vitest";
import { orderGate, type OrderedTask } from "../../src/modules/task-coordinator/ordering.js";
import { backoffMs, decideRetry, type RetryPolicy } from "../../src/modules/task-coordinator/retry.js";

const POLICY: RetryPolicy = { maxAttempts: 3, backoffBaseMs: 1000, backoffCapMs: 3000 };

describe("backoffMs", () => {
  it("doubles from the base and stops at the cap", () => {
    expect([1, 2, 3, 4].map((done) => backoffMs(done, POLICY))).toEqual([1000, 2000, 3000, 3000]);
  });
});

describe("decideRetry", () => {
  const base = { attemptsDone: 1, errorCode: "RATE_LIMITED", nowMs: 0, deadlineMs: 60_000, policy: POLICY };

  it("retries a rate-limited attempt after the backoff", () => {
    expect(decideRetry(base)).toEqual({ kind: "retry", delayMs: 1000 });
  });

  it("never retries an error that is not on the retryable list", () => {
    for (const errorCode of ["INVALID_OUTPUT", "CREW_UNAVAILABLE", "CANCELLED"]) {
      expect(decideRetry({ ...base, errorCode })).toEqual({ kind: "give_up", reason: "NOT_RETRYABLE" });
    }
  });

  it("gives up once every allowed attempt has run", () => {
    expect(decideRetry({ ...base, attemptsDone: 3 })).toEqual({ kind: "give_up", reason: "RETRY_EXHAUSTED" });
  });

  it("does not start a retry that would land after the deadline", () => {
    expect(decideRetry({ ...base, deadlineMs: 500 })).toEqual({ kind: "give_up", reason: "DEADLINE_EXCEEDED" });
  });
});

function task(taskId: string, platformOrder: number, status: OrderedTask["status"], deadlineMs: number, channelId = "ch-1") {
  return { taskId, channelId, platformOrder, status, deadlineMs };
}

describe("orderGate", () => {
  const NOW = 10_000;

  it("is clear when no earlier task of the channel is still open", () => {
    const later = task("m2", 2, "RUNNING", NOW + 5000);
    expect(orderGate(later, [task("m1", 1, "DONE", NOW + 5000), later], NOW)).toEqual({ kind: "clear" });
  });

  it("waits on the earliest open earlier task of the same channel", () => {
    const later = task("m3", 3, "RUNNING", NOW + 5000);
    const channel = [task("m1", 1, "RUNNING", NOW + 5000), task("m2", 2, "QUEUED", NOW + 5000), later];
    expect(orderGate(later, channel, NOW)).toEqual({ kind: "wait", waitingOn: "m1" });
  });

  it("never waits on another channel", () => {
    const later = task("m2", 2, "RUNNING", NOW + 5000);
    const other = task("x1", 1, "RUNNING", NOW + 5000, "ch-2");
    expect(orderGate(later, [other, later], NOW)).toEqual({ kind: "clear" });
  });

  it("proceeds once every earlier task is past its deadline, and names the one left unfinished", () => {
    const later = task("m2", 2, "RUNNING", NOW + 5000);
    const expired = task("m1", 1, "RUNNING", NOW - 1);
    expect(orderGate(later, [expired, later], NOW)).toEqual({ kind: "advanced", unfinished: "m1" });
  });

  it("ignores earlier tasks that already reached a terminal state", () => {
    const later = task("m3", 3, "RUNNING", NOW + 5000);
    const channel = [task("m1", 1, "PENDING_REVIEW", NOW - 1), task("m2", 2, "DISCARDED", NOW - 1), later];
    expect(orderGate(later, channel, NOW)).toEqual({ kind: "clear" });
  });
});
