import { describe, expect, it } from "vitest";
import { createTaskCoordinator, TaskNotFoundError } from "../../src/modules/task-coordinator/index.js";
import {
  eventOf,
  FakeClock,
  FakeFacts,
  harnessWith,
  keyOfEvent,
  mustTake,
  MutableConcurrency,
  resultFor,
  sequentialIds,
} from "./helpers.js";

/**
 * VW-SUB017-AC001: scheduling fault injection. The scenarios are slow requests, rate limits, full queues, process
 * restart, delete and cancel, and a predecessor that times out. Each one checks that nothing is allowed by default,
 * nothing is deducted, an expired result never comes back as valid output, and no backlog grows without a bound.
 */
describe("slow request", () => {
  it("sends the late result of a task whose deadline passed while it ran to human review, and writes nothing", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(5000));
    await mustTake(h.coordinator);
    h.clock.advance(6000);
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({
      status: "discarded",
      reason: "DEADLINE_EXCEEDED",
    });
    expect(h.facts.applied).toEqual([]);
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("DEADLINE_EXCEEDED");
    expect(h.log.forTask(ref.taskId).at(-1)).toMatchObject({ status: "TIMED_OUT", level: "WARN" });
  });

  it("sends an overdue task to human review without writing a verdict or a deduction", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(5000));
    await mustTake(h.coordinator);
    h.clock.advance(6000);
    expect(await h.coordinator.sweep()).toBe(1);
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(h.facts.applied).toEqual([]);
    expect(h.log.forTask(ref.taskId).at(-1)).toMatchObject({ status: "TIMED_OUT", level: "WARN" });
  });
});

describe("rate limit", () => {
  it("backs off between attempts and then hands the task to human review", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));

    const first = await mustTake(h.coordinator);
    expect(await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED")).toEqual({
      status: "retry_scheduled",
      notBeforeMs: Date.parse(h.clock.at(0)) + 1000,
    });
    await h.coordinator.finishBatch(first.batchId);

    h.clock.advance(1000);
    const second = await mustTake(h.coordinator);
    expect(second.tasks).toMatchObject([{ attempt: 2 }]);
    expect(await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED")).toEqual({
      status: "retry_scheduled",
      notBeforeMs: Date.parse(h.clock.at(0)) + 2000,
    });
    await h.coordinator.finishBatch(second.batchId);

    h.clock.advance(2000);
    const third = await mustTake(h.coordinator);
    expect(await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED")).toEqual({
      status: "pending_review",
      reason: "RETRY_EXHAUSTED",
    });
    await h.coordinator.finishBatch(third.batchId);

    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(h.facts.applied).toEqual([]);
  });
});

describe("full queue", () => {
  it("keeps every lane queue bounded and marks the overflow for human review", async () => {
    const h = harnessWith({ limits: { maxQueued: { PAID: 2, REALTIME: 3, BACKGROUND: 2 } } });
    const refs = [];
    for (let index = 1; index <= 10; index += 1) {
      refs.push(await h.coordinator.enqueue(eventOf({ platformMessageId: `flood-${index}` }), h.clock.at(60_000)));
    }
    const statuses = await Promise.all(refs.map((ref) => h.coordinator.statusOf(ref.taskId)));
    expect(statuses.filter((status) => status === "QUEUED")).toHaveLength(3);
    expect(statuses.filter((status) => status === "PENDING_REVIEW")).toHaveLength(7);
  });
});

describe("process restart", () => {
  it("discards the result of a task that a restarted process no longer knows", async () => {
    const facts = new FakeFacts();
    const clock = new FakeClock();
    const limits = { maxBatchWaitMs: 0 };
    const before = createTaskCoordinator({
      facts,
      concurrency: new MutableConcurrency(4),
      clock: clock.now,
      newId: sequentialIds("old"),
      limits,
    });
    const ref = await before.enqueue(eventOf(), clock.at(60_000));
    await before.takeBatch();

    const after = createTaskCoordinator({
      facts,
      concurrency: new MutableConcurrency(4),
      clock: clock.now,
      newId: sequentialIds("new"),
      limits,
    });
    expect(await after.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({
      status: "discarded",
      reason: "UNKNOWN_TASK",
    });
    await expect(after.statusOf(ref.taskId)).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(facts.applied).toEqual([]);
  });
});

describe("delete and cancel", () => {
  it("cancels a queued background task at once, even when its lane has no free slot", async () => {
    const h = harnessWith({ limit: 1 });
    const event = eventOf({ platformMessageId: "bg-1" });
    const ref = await h.coordinator.enqueueInLane("BACKGROUND", event, h.clock.at(60_000));
    expect(await h.coordinator.takeBatch()).toBeNull();

    expect(await h.coordinator.cancelEvent(keyOfEvent(event))).toEqual({ cancelledTaskIds: [ref.taskId] });
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CANCELLED");
  });

  it("discards the result of a running task once its data is deleted", async () => {
    const h = harnessWith();
    const event = eventOf();
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    await mustTake(h.coordinator);
    h.facts.deleteData(keyOfEvent(event));
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({
      status: "discarded",
      reason: "DATA_DELETED",
    });
    expect(h.facts.applied).toEqual([]);
  });
});

describe("predecessor timeout", () => {
  it("holds a later message only until the earlier one's deadline, then proceeds and records the gap", async () => {
    const h = harnessWith();
    const first = await h.coordinator.enqueue(eventOf({ platformMessageId: "m1", platformOrder: 1 }), h.clock.at(2000));
    const second = await h.coordinator.enqueue(
      eventOf({ platformMessageId: "m2", platformOrder: 2 }),
      h.clock.at(60_000),
    );
    await mustTake(h.coordinator);

    expect(await h.coordinator.commitResult(second.taskId, resultFor(second.taskId))).toEqual({
      status: "waiting",
      waitingOn: first.taskId,
    });
    h.clock.advance(2000);
    expect(await h.coordinator.commitResult(second.taskId, resultFor(second.taskId))).toEqual({
      status: "committed",
    });
    expect(h.log.forTask(second.taskId).at(-1)?.data).toEqual({ orderNote: `PREDECESSOR_UNFINISHED:${first.taskId}` });
    expect(await h.coordinator.commitResult(first.taskId, resultFor(first.taskId))).toEqual({
      status: "discarded",
      reason: "DEADLINE_EXCEEDED",
    });
    expect(await h.coordinator.statusOf(first.taskId)).toBe("PENDING_REVIEW");
  });

  it("does not record the gap when the expiry sweep already moved the predecessor to human review", async () => {
    const h = harnessWith();
    const first = await h.coordinator.enqueue(eventOf({ platformMessageId: "m1", platformOrder: 1 }), h.clock.at(2000));
    const second = await h.coordinator.enqueue(
      eventOf({ platformMessageId: "m2", platformOrder: 2 }),
      h.clock.at(60_000),
    );
    await mustTake(h.coordinator);
    h.clock.advance(2000);
    expect(await h.coordinator.sweep()).toBe(1);

    expect(await h.coordinator.commitResult(second.taskId, resultFor(second.taskId))).toEqual({ status: "committed" });
    expect(h.log.forTask(second.taskId).at(-1)?.data).toBeNull();
    expect(h.log.forTask(first.taskId).at(-1)).toMatchObject({ status: "TIMED_OUT" });
  });

  it("never holds a message of another channel", async () => {
    const h = harnessWith();
    const slow = await h.coordinator.enqueue(eventOf({ platformMessageId: "slow", platformOrder: 1 }), h.clock.at(60_000));
    const other = await h.coordinator.enqueue(
      eventOf({ channelId: "ch-2", platformMessageId: "fast", platformOrder: 2 }),
      h.clock.at(60_000),
    );
    await mustTake(h.coordinator);
    expect(await h.coordinator.commitResult(other.taskId, resultFor(other.taskId))).toEqual({ status: "committed" });
    expect(await h.coordinator.statusOf(slow.taskId)).toBe("RUNNING");
  });
});
