import { describe, expect, it } from "vitest";
import {
  createTaskCoordinator,
  DEFAULT_COORDINATOR_LIMITS,
  TaskConfigError,
  TaskInputError,
  TaskNotFoundError,
} from "../../src/modules/task-coordinator/index.js";
import { FakeFacts, eventOf, harnessWith, keyOfEvent, mustTake, MutableConcurrency, START, resultFor, FakeClock, sequentialIds } from "./helpers.js";

describe("enqueue", () => {
  it("returns a task reference bound to the event's version and processing generation", async () => {
    const h = harnessWith();
    const deadline = h.clock.at(60_000);
    const ref = await h.coordinator.enqueue(eventOf(), deadline);
    expect(ref).toEqual({
      contractVersion: "1",
      taskId: expect.any(String),
      eventVersion: 1,
      processingGeneration: 1,
      deadlineAt: deadline,
    });
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("QUEUED");
  });

  it("returns the existing task when the same event arrives again", async () => {
    const h = harnessWith();
    const first = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    const again = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    expect(again.taskId).toBe(first.taskId);
  });

  it("refuses a field that is not usable and names only the field", async () => {
    const h = harnessWith();
    await expect(h.coordinator.enqueue(eventOf({ channelId: "" }), h.clock.at(1000))).rejects.toMatchObject({
      field: "channelId",
    });
    await expect(h.coordinator.enqueue(eventOf(), "not a time")).rejects.toBeInstanceOf(TaskInputError);
  });

  it("reports an unknown task as not found", async () => {
    const h = harnessWith();
    await expect(h.coordinator.statusOf("missing")).rejects.toBeInstanceOf(TaskNotFoundError);
    await expect(h.coordinator.reasonOf("missing")).rejects.toBeInstanceOf(TaskNotFoundError);
  });

  it("discards an event whose data is already deleted, and never queues it", async () => {
    const h = harnessWith();
    const event = eventOf();
    h.facts.deleteData(keyOfEvent(event));
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("DISCARDED");
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("DATA_DELETED");
    expect(await h.coordinator.takeBatch()).toBeNull();
  });

  it("refuses a body that a batch can never hold, and marks it for human review", async () => {
    const h = harnessWith({ limits: { maxBatchBytes: 10 } });
    const ref = await h.coordinator.enqueue(eventOf({ body: "x".repeat(11) }), h.clock.at(60_000));
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("INPUT_TOO_LARGE");
  });

  it("refuses a task that would exceed its lane's queue bound, and marks it for human review", async () => {
    const h = harnessWith({ limits: { maxQueued: { REALTIME: 2 } } });
    const refs = [];
    for (const id of ["q-1", "q-2", "q-3", "q-4"]) {
      refs.push(await h.coordinator.enqueue(eventOf({ platformMessageId: id }), h.clock.at(60_000)));
    }
    const statuses = await Promise.all(refs.map((ref) => h.coordinator.statusOf(ref.taskId)));
    expect(statuses).toEqual(["QUEUED", "QUEUED", "PENDING_REVIEW", "PENDING_REVIEW"]);
    const overflow = refs.at(2);
    expect(overflow).toBeDefined();
    expect(await h.coordinator.reasonOf(overflow?.taskId ?? "")).toBe("QUEUE_FULL");
  });
});

describe("takeBatch", () => {
  it("hands out running tasks, and a slot stays taken until the batch is finished", async () => {
    const h = harnessWith({ limit: 1 });
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    const batch = await mustTake(h.coordinator);
    expect(batch).toMatchObject({
      lane: "REALTIME",
      tasks: [{ taskId: ref.taskId, correlationId: "corr-ch-1-msg-1", text: "synthetic text", attempt: 1 }],
    });
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("RUNNING");

    await h.coordinator.enqueue(eventOf({ platformMessageId: "msg-2" }), h.clock.at(60_000));
    expect(await h.coordinator.takeBatch()).toBeNull();

    await h.coordinator.finishBatch(batch.batchId);
    expect(await h.coordinator.takeBatch()).not.toBeNull();
  });

  it("dispatches paid review before real-time review", async () => {
    const h = harnessWith({ limit: 1 });
    await h.coordinator.enqueueInLane("REALTIME", eventOf({ platformMessageId: "rt" }), h.clock.at(60_000));
    const paid = await h.coordinator.enqueueInLane(
      "PAID",
      eventOf({ platformMessageId: "paid", platformOrder: 2 }),
      h.clock.at(60_000),
    );
    const batch = await mustTake(h.coordinator);
    expect(batch.lane).toBe("PAID");
    expect(batch.tasks.map((task) => task.taskId)).toEqual([paid.taskId]);
  });

  it("keeps background batches under their ceiling and leaves a slot for interactive work", async () => {
    const h = harnessWith({ limit: 4, limits: { maxBatchItems: 1 } });
    for (const id of ["bg-1", "bg-2", "bg-3", "bg-4"]) {
      await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: id }), h.clock.at(60_000));
    }
    const started: string[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const batch = await h.coordinator.takeBatch();
      if (batch !== null) started.push(batch.lane);
    }
    expect(started).toEqual(["BACKGROUND", "BACKGROUND", "BACKGROUND"]);

    await h.coordinator.enqueue(eventOf({ platformMessageId: "live" }), h.clock.at(60_000));
    expect((await mustTake(h.coordinator)).lane).toBe("REALTIME");
  });

  it("lists batches that no longer have a running task as idle", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    const batch = await mustTake(h.coordinator);
    expect(await h.coordinator.idleBatchIds()).toEqual([]);
    await h.coordinator.reportFailure(ref.taskId, "INVALID_OUTPUT");
    expect(await h.coordinator.idleBatchIds()).toEqual([batch.batchId]);
  });
});

describe("reportFailure", () => {
  it("schedules a retry for a rate-limited attempt and holds the task until the backoff passes", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    const batch = await mustTake(h.coordinator);
    expect(await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED")).toEqual({
      status: "retry_scheduled",
      notBeforeMs: Date.parse(START) + 1000,
    });
    await h.coordinator.finishBatch(batch.batchId);
    expect(await h.coordinator.takeBatch()).toBeNull();

    h.clock.advance(1000);
    const retry = await mustTake(h.coordinator);
    expect(retry.tasks).toMatchObject([{ taskId: ref.taskId, attempt: 2 }]);
  });

  it("moves a non-retryable failure to human review, with the error code as the reason", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await mustTake(h.coordinator);
    expect(await h.coordinator.reportFailure(ref.taskId, "INVALID_OUTPUT")).toEqual({
      status: "pending_review",
      reason: "INVALID_OUTPUT",
    });
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(h.log.forTask(ref.taskId).at(-1)).toMatchObject({
      stage: "ERROR",
      status: "FAILED",
      level: "ERROR",
      errorCode: "INVALID_OUTPUT",
    });
  });

  it("ignores a failure report for a task that is no longer running", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await mustTake(h.coordinator);
    await h.coordinator.cancelEvent(keyOfEvent(eventOf()));
    expect(await h.coordinator.reportFailure(ref.taskId, "RATE_LIMITED")).toEqual({
      status: "ignored",
      reason: "CANCELLED",
    });
  });

  it("refuses an error code the Technical Log cannot record", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await mustTake(h.coordinator);
    await expect(h.coordinator.reportFailure(ref.taskId, "not valid")).rejects.toMatchObject({ field: "errorCode" });
  });
});

describe("commitResult", () => {
  it("writes the verdict once, marks the task done, and logs the evidence", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await mustTake(h.coordinator);
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({ status: "committed" });
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("DONE");
    expect(h.facts.applied).toEqual([ref.taskId]);
    const entry = h.log.forTask(ref.taskId).at(-1);
    expect(entry).toMatchObject({ stage: "COMMIT", status: "OK", level: "INFO" });
    expect(entry?.evidence.map((item) => item.kind)).toEqual(["ITEM_ID_MAP", "VALIDATED_JSON"]);
  });

  it("does not write the verdict twice when the same task is committed again", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await mustTake(h.coordinator);
    await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId));
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({
      status: "discarded",
      reason: "ALREADY_SETTLED",
    });
    expect(h.facts.applied).toEqual([ref.taskId]);
  });

  it("discards a discarded result without writing any evidence", async () => {
    const h = harnessWith();
    const event = eventOf();
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    await mustTake(h.coordinator);
    await h.coordinator.cancelEvent(keyOfEvent(event));
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({
      status: "discarded",
      reason: "CANCELLED",
    });
    expect(h.facts.applied).toEqual([]);
    expect(h.log.forTask(ref.taskId).at(-1)).toMatchObject({ status: "SKIPPED", evidence: [] });
  });

  it("treats a result for an unknown task as discarded", async () => {
    const h = harnessWith();
    expect(await h.coordinator.commitResult("missing", resultFor("missing"))).toEqual({
      status: "discarded",
      reason: "UNKNOWN_TASK",
    });
  });
});

describe("cancelEvent and sweep", () => {
  it("discards the event's queued and running tasks at once and reports the batch as idle", async () => {
    const h = harnessWith({ limit: 2 });
    const event = eventOf();
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    const batch = await mustTake(h.coordinator);
    expect(await h.coordinator.cancelEvent(keyOfEvent(event))).toEqual({ cancelledTaskIds: [ref.taskId] });
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CANCELLED");
    expect(await h.coordinator.idleBatchIds()).toEqual([batch.batchId]);
  });

  it("moves tasks past their deadline to human review and counts them", async () => {
    const h = harnessWith();
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(1000));
    await mustTake(h.coordinator);
    h.clock.advance(1000);
    expect(await h.coordinator.sweep()).toBe(1);
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("DEADLINE_EXCEEDED");
    expect(h.log.forTask(ref.taskId).at(-1)).toMatchObject({ status: "TIMED_OUT" });
  });
});

describe("configuration", () => {
  it("refuses limits that cannot be used", () => {
    const base = { facts: new FakeFacts(), concurrency: new MutableConcurrency(1) };
    expect(() => createTaskCoordinator({ ...base, limits: { maxBatchItems: 0 } })).toThrow(TaskConfigError);
    expect(() => createTaskCoordinator({ ...base, limits: { backoffBaseMs: 5000, backoffCapMs: 1000 } })).toThrow(
      TaskConfigError,
    );
    expect(() => createTaskCoordinator({ ...base, limits: { maxQueued: { PAID: 0 } } })).toThrow(TaskConfigError);
  });

  it("refuses a concurrency limit below one when it takes a batch", async () => {
    const h = harnessWith({ limit: 0 });
    await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await expect(h.coordinator.takeBatch()).rejects.toBeInstanceOf(TaskConfigError);
  });

  it("keeps the placeholder message when no options are given", async () => {
    const unwired = createTaskCoordinator();
    await expect(unwired.enqueue(eventOf(), START)).rejects.toThrow("MODULE_NOT_IMPLEMENTED: TaskCoordinator.enqueue");
    await expect(unwired.statusOf("x")).rejects.toThrow("MODULE_NOT_IMPLEMENTED: TaskCoordinator.statusOf");
  });

  it("applies the default batch size when no limits are given", async () => {
    const clock = new FakeClock();
    const coordinator = createTaskCoordinator({
      facts: new FakeFacts(),
      concurrency: new MutableConcurrency(4),
      clock: clock.now,
      newId: sequentialIds(),
    });
    for (const id of ["d-1", "d-2", "d-3"]) {
      await coordinator.enqueue(eventOf({ platformMessageId: id }), clock.at(60_000));
    }
    expect(await coordinator.takeBatch()).toBeNull();

    for (let index = 4; index <= DEFAULT_COORDINATOR_LIMITS.maxBatchItems; index += 1) {
      await coordinator.enqueue(eventOf({ platformMessageId: `d-${index}` }), clock.at(60_000));
    }
    const batch = await mustTake(coordinator);
    expect(batch.tasks).toHaveLength(DEFAULT_COORDINATOR_LIMITS.maxBatchItems);
  });
});

describe("commit order across lanes (B4)", () => {
  it("a queued background task does not hold back a real-time commit in the same channel", async () => {
    const h = harnessWith({ limit: 1 });
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg", platformOrder: 1 }), h.clock.at(60_000));
    const live = await h.coordinator.enqueue(eventOf({ platformMessageId: "live", platformOrder: 2 }), h.clock.at(60_000));
    expect((await mustTake(h.coordinator)).lane).toBe("REALTIME");
    expect(await h.coordinator.commitResult(live.taskId, resultFor(live.taskId))).toEqual({ status: "committed" });
  });

  it("a running background task does not hold back a real-time commit in the same channel", async () => {
    const h = harnessWith({ limit: 2, limits: { maxBatchItems: 1 } });
    const background = await h.coordinator.enqueueInLane(
      "BACKGROUND",
      eventOf({ platformMessageId: "bg", platformOrder: 1 }),
      h.clock.at(60_000),
    );
    const live = await h.coordinator.enqueue(eventOf({ platformMessageId: "live", platformOrder: 2 }), h.clock.at(60_000));
    expect((await mustTake(h.coordinator)).lane).toBe("REALTIME");
    expect((await mustTake(h.coordinator)).lane).toBe("BACKGROUND");
    expect(await h.coordinator.statusOf(background.taskId)).toBe("RUNNING");
    expect(await h.coordinator.commitResult(live.taskId, resultFor(live.taskId))).toEqual({ status: "committed" });
  });

  it("a paid commit does not wait for an earlier real-time task of the same channel", async () => {
    const h = harnessWith({ limit: 1 });
    await h.coordinator.enqueueInLane("REALTIME", eventOf({ platformMessageId: "rt", platformOrder: 1 }), h.clock.at(60_000));
    const paid = await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 2 }), h.clock.at(60_000));
    expect((await mustTake(h.coordinator)).lane).toBe("PAID");
    expect(await h.coordinator.commitResult(paid.taskId, resultFor(paid.taskId))).toEqual({ status: "committed" });
  });

  it("keeps the commit order inside one lane", async () => {
    const h = harnessWith({ limit: 1 });
    const first = await h.coordinator.enqueue(eventOf({ platformMessageId: "m1", platformOrder: 1 }), h.clock.at(60_000));
    const second = await h.coordinator.enqueue(eventOf({ platformMessageId: "m2", platformOrder: 2 }), h.clock.at(60_000));
    await mustTake(h.coordinator);
    expect(await h.coordinator.commitResult(second.taskId, resultFor(second.taskId))).toEqual({
      status: "waiting",
      waitingOn: first.taskId,
    });
  });
});

describe("settled records (N2)", () => {
  it("keeps a settled task queryable and deduplicated, and schedules only the tasks that are still open", async () => {
    const h = harnessWith({ limit: 4 });
    const first = eventOf({ channelId: "ch-0", platformMessageId: "s-0", platformOrder: 0 });
    let firstTaskId = "";
    for (let index = 0; index < 300; index += 1) {
      const event =
        index === 0 ? first : eventOf({ channelId: `ch-${index % 5}`, platformMessageId: `s-${index}`, platformOrder: index });
      const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
      if (index === 0) firstTaskId = ref.taskId;
      const batch = await mustTake(h.coordinator);
      expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({ status: "committed" });
      await h.coordinator.finishBatch(batch.batchId);
    }

    const again = await h.coordinator.enqueue(first, h.clock.at(60_000));
    expect(again.taskId).toBe(firstTaskId);
    expect(await h.coordinator.statusOf(firstTaskId)).toBe("DONE");
    expect(await h.coordinator.cancelEvent(keyOfEvent(first))).toEqual({ cancelledTaskIds: [] });
    expect(h.facts.applied).toHaveLength(300);

    const live = await h.coordinator.enqueue(
      eventOf({ channelId: "ch-0", platformMessageId: "live", platformOrder: 1000 }),
      h.clock.at(60_000),
    );
    const batch = await mustTake(h.coordinator);
    expect(batch.tasks.map((task) => task.taskId)).toEqual([live.taskId]);
    expect(await h.coordinator.commitResult(live.taskId, resultFor(live.taskId))).toEqual({ status: "committed" });
  });
});
