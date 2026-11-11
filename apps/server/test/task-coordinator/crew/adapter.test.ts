import { describe, expect, it } from "vitest";
import {
  createCrewExecutor,
  createDynamicConcurrency,
  createTaskCoordinator,
  type CrewExecutor,
  type CrewPort,
  type VerdictWriter,
} from "../../../src/modules/task-coordinator/index.js";
import { FakeFacts, FakeClock, MutableConcurrency, eventOf, harnessWith, keyOfEvent, sequentialIds, type Harness } from "../helpers.js";
import { completedFor, firstJob, FakeCrew, flush } from "./fake-crew.js";
import { HungCrew } from "./hung-crew.js";
import type { CrewReport } from "../../../src/modules/task-coordinator/index.js";

/** Resolves with the work's value, or rejects when the work has not settled within `ms`. A hang fails here, not in the run. */
async function withinMs<T>(work: Promise<T>, ms = 500): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`did not return within ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}
import type { InferenceResultItem } from "@voxward/contracts";

interface Written {
  readonly taskId: string;
  readonly item: InferenceResultItem;
}

/** An executor bound to a harness, plus the list of verdicts it wrote. */
function executorFor(h: Harness, crew: CrewPort): { executor: CrewExecutor; written: Written[] } {
  const written: Written[] = [];
  const writeVerdict: VerdictWriter = (taskId, item) => {
    written.push({ taskId, item });
  };
  return { executor: createCrewExecutor({ coordinator: h.coordinator, crew, writeVerdict }), written };
}

/**
 * VW-SUB018-AC001: Crew adapter contract. Crew available, Crew unavailable (explicit failure), a finished session with
 * no item (not a verdict), cancel, host resource shrink, and restart. The fake Crew replaces the real one, so the
 * real session behavior is still unverified (S029).
 */
describe("Crew available", () => {
  it("submits a batch and commits each item that Crew returns as validated output", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const a = await h.coordinator.enqueue(eventOf({ platformMessageId: "a" }), h.clock.at(60_000));
    const b = await h.coordinator.enqueue(eventOf({ platformMessageId: "b" }), h.clock.at(60_000));

    expect(await executor.pump()).toBe(1);
    const job = firstJob(crew);
    expect(job.items.map((item) => item.taskId)).toEqual([a.taskId, b.taskId]);
    crew.finish(crew.refFor(job.batchId), completedFor(job));
    await executor.drain();

    expect(await h.coordinator.statusOf(a.taskId)).toBe("DONE");
    expect(await h.coordinator.statusOf(b.taskId)).toBe("DONE");
    expect(written.map((entry) => entry.taskId)).toEqual([a.taskId, b.taskId]);
  });

  it("logs the item-id map and the validated JSON as the evidence of each commit", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor } = executorFor(h, crew);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    crew.finish(crew.refFor(job.batchId), completedFor(job, "BLOCK"));
    await executor.drain();
    const entry = h.log.forTask(ref.taskId).at(-1);
    expect(entry?.evidence.map((item) => item.kind)).toEqual(["ITEM_ID_MAP", "VALIDATED_JSON"]);
    expect(entry?.evidence[0]?.payload).toBe(JSON.stringify({ [`item-${ref.taskId}`]: job.items[0]?.correlationId }));
  });

  it("does not treat a task with no single validated item as a verdict", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const a = await h.coordinator.enqueue(eventOf({ platformMessageId: "a" }), h.clock.at(60_000));
    const b = await h.coordinator.enqueue(eventOf({ platformMessageId: "b" }), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    const onlyA = completedFor({ ...job, items: job.items.slice(0, 1) });
    crew.finish(crew.refFor(job.batchId), onlyA);
    await executor.drain();

    expect(await h.coordinator.statusOf(a.taskId)).toBe("DONE");
    expect(await h.coordinator.statusOf(b.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(b.taskId)).toBe("INVALID_OUTPUT");
    expect(written.map((entry) => entry.taskId)).toEqual([a.taskId]);
  });

  it("treats two items for one task as invalid output, not as a choice between them", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    const item = completedFor(job);
    if (item.kind !== "completed") throw new Error("expected a completed report");
    crew.finish(crew.refFor(job.batchId), { kind: "completed", items: [...item.items, ...item.items] });
    await executor.drain();
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("INVALID_OUTPUT");
    expect(written).toEqual([]);
  });

  it("sends a retryable Crew failure back to the queue with its error code", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor } = executorFor(h, crew);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    crew.finish(crew.refFor(job.batchId), { kind: "failed", errorCode: "RATE_LIMITED" });
    await executor.drain();
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("QUEUED");
  });

  it("records a Crew error code the Technical Log cannot hold as CREW_FAILED", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor } = executorFor(h, crew);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    crew.finish(crew.refFor(job.batchId), { kind: "failed", errorCode: "not valid" });
    await executor.drain();
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CREW_FAILED");
  });

  it("fails the batch explicitly when a finished report is malformed, and writes no verdict", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    crew.finish(crew.refFor(job.batchId), { kind: "completed", items: undefined as unknown as InferenceResultItem[] });
    await executor.drain();
    expect(await h.coordinator.statusOf(ref.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CREW_FAILED");
    expect(written).toEqual([]);
  });

  it("holds a result that must wait for an earlier message, and commits it on a later pump", async () => {
    const h = harnessWith({ limit: 4, limits: { maxBatchItems: 1 } });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const first = await h.coordinator.enqueue(eventOf({ platformMessageId: "m1", platformOrder: 1 }), h.clock.at(60_000));
    const second = await h.coordinator.enqueue(eventOf({ platformMessageId: "m2", platformOrder: 2 }), h.clock.at(60_000));
    expect(await executor.pump()).toBe(2);

    const [jobFirst, jobSecond] = crew.started;
    if (jobFirst === undefined || jobSecond === undefined) throw new Error("expected two sessions");
    crew.finish(crew.refFor(jobSecond.batchId), completedFor(jobSecond));
    await flush();
    expect(await h.coordinator.statusOf(second.taskId)).toBe("RUNNING");

    crew.finish(crew.refFor(jobFirst.batchId), completedFor(jobFirst));
    await executor.drain();
    expect(await executor.pump()).toBe(0);
    expect(await h.coordinator.statusOf(second.taskId)).toBe("DONE");
    expect(written.map((entry) => entry.taskId)).toEqual([first.taskId, second.taskId]);
  });
});

describe("Crew unavailable", () => {
  it("fails every task explicitly and writes no verdict", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    crew.available = false;
    const { executor, written } = executorFor(h, crew);
    const a = await h.coordinator.enqueue(eventOf({ platformMessageId: "a" }), h.clock.at(60_000));
    const b = await h.coordinator.enqueue(eventOf({ platformMessageId: "b" }), h.clock.at(60_000));

    expect(await executor.pump()).toBe(1);
    await executor.drain();

    expect(await h.coordinator.statusOf(a.taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(a.taskId)).toBe("CREW_UNAVAILABLE");
    expect(await h.coordinator.statusOf(b.taskId)).toBe("PENDING_REVIEW");
    expect(written).toEqual([]);
  });

  it("fails the tasks when a started session ends with an error, not with a default allow", async () => {
    const port: CrewPort = {
      start: async () => ({
        crewRef: "broken",
        done: new Promise<CrewReport>((_resolve, reject) => setImmediate(() => reject(new Error("synthetic: connection lost")))),
      }),
      cancel: async () => undefined,
    };
    const h = harnessWith({ limit: 4 });
    const { executor, written } = executorFor(h, port);
    const ref = await h.coordinator.enqueue(eventOf(), h.clock.at(60_000));
    await executor.pump();
    await executor.drain();
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CREW_UNAVAILABLE");
    expect(written).toEqual([]);
  });
});

describe("cancel", () => {
  it("cancels the running session when its only event is cancelled, and frees its slot", async () => {
    const h = harnessWith({ limit: 1 });
    const crew = new FakeCrew();
    const { executor } = executorFor(h, crew);
    const event = eventOf({ platformMessageId: "a" });
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);
    const crewRef = crew.refFor(job.batchId);

    await executor.cancelEvent(keyOfEvent(event));
    expect(crew.cancelled).toEqual([crewRef]);
    expect(await h.coordinator.reasonOf(ref.taskId)).toBe("CANCELLED");

    await flush();
    const next = await h.coordinator.enqueue(eventOf({ platformMessageId: "b" }), h.clock.at(60_000));
    expect(await executor.pump()).toBe(1);
    const latest = crew.started.at(-1);
    expect(latest?.items.map((item) => item.taskId)).toEqual([next.taskId]);
    expect(await h.coordinator.statusOf(next.taskId)).toBe("RUNNING");
  });

  it("keeps a session that still serves another live task", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const cancelled = eventOf({ platformMessageId: "a" });
    const kept = await h.coordinator.enqueue(eventOf({ platformMessageId: "b" }), h.clock.at(60_000));
    await h.coordinator.enqueue(cancelled, h.clock.at(60_000));
    await executor.pump();
    const job = firstJob(crew);

    await executor.cancelEvent(keyOfEvent(cancelled));
    expect(crew.cancelled).toEqual([]);

    crew.finish(crew.refFor(job.batchId), completedFor(job));
    await executor.drain();
    expect(await h.coordinator.statusOf(kept.taskId)).toBe("DONE");
    expect(written.map((entry) => entry.taskId)).toEqual([kept.taskId]);
  });
});

describe("dynamic concurrency at the executor", () => {
  it("never runs more sessions than the limit, and waits for the host to free capacity when it shrinks", async () => {
    const clock = new FakeClock();
    const signal = { freeMemoryRatio: 0.6, loadPerCpu: 0.3 };
    const concurrency = createDynamicConcurrency(
      { min: 1, max: 4 },
      {
        read: () => signal,
      },
    );
    const coordinator = createTaskCoordinator({
      facts: new FakeFacts(),
      concurrency,
      clock: clock.now,
      newId: sequentialIds(),
      limits: { maxBatchItems: 1, maxBatchWaitMs: 0 },
    });
    const crew = new FakeCrew();
    const executor = createCrewExecutor({ coordinator, crew, writeVerdict: () => undefined });
    for (let index = 1; index <= 6; index += 1) {
      await coordinator.enqueue(eventOf({ platformMessageId: `c-${index}` }), clock.at(60_000));
    }

    expect(await executor.pump()).toBe(4);
    expect(crew.maxOpen).toBe(4);

    signal.freeMemoryRatio = 0.05;
    const jobs = crew.started.slice(0, 2);
    for (const job of jobs) crew.finish(crew.refFor(job.batchId), completedFor(job));
    await flush();
    expect(await executor.pump()).toBe(0);

    for (const job of crew.started.slice(2)) crew.finish(crew.refFor(job.batchId), completedFor(job));
    await executor.drain();
    expect(await executor.pump()).toBe(1);
    expect(crew.maxOpen).toBe(4);
  });
});

describe("restart", () => {
  it("starts nothing from a fresh process, and the old process's tasks stay unknown to it", async () => {
    const before = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor } = executorFor(before, crew);
    const ref = await before.coordinator.enqueue(eventOf(), before.clock.at(60_000));
    await executor.pump();

    const freshCrew = new FakeCrew();
    const fresh = createCrewExecutor({
      coordinator: createTaskCoordinator({
        facts: new FakeFacts(),
        concurrency: new MutableConcurrency(4),
        clock: before.clock.now,
        newId: sequentialIds("new"),
      }),
      crew: freshCrew,
      writeVerdict: () => undefined,
    });
    expect(await fresh.pump()).toBe(0);
    expect(freshCrew.started).toEqual([]);
    expect(await before.coordinator.statusOf(ref.taskId)).toBe("RUNNING");
  });
});

describe("hung Crew calls (B5)", () => {
  it("returns from cancelEvent while a cancel never answers, and other channels keep dispatching", async () => {
    const h = harnessWith({ limit: 2 });
    const crew = new HungCrew("cancel");
    const { executor } = executorFor(h, crew);
    const stuck = eventOf({ channelId: "ch-a", platformMessageId: "a1" });
    await h.coordinator.enqueue(stuck, h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);

    await withinMs(executor.cancelEvent(keyOfEvent(stuck)));
    expect(crew.cancelled).toHaveLength(1);

    const other = await h.coordinator.enqueue(eventOf({ channelId: "ch-b", platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    expect(await h.coordinator.statusOf(other.taskId)).toBe("RUNNING");
    expect(crew.maxOpen).toBe(2);
  });

  it("returns from pump when an expired batch's cancel never answers, and other channels keep dispatching", async () => {
    const h = harnessWith({ limit: 2 });
    const crew = new HungCrew("cancel");
    const { executor } = executorFor(h, crew);
    const expiring = await h.coordinator.enqueue(eventOf({ channelId: "ch-a", platformMessageId: "a1" }), h.clock.at(1000));
    expect(await withinMs(executor.pump())).toBe(1);
    h.clock.advance(1000);

    expect(await withinMs(executor.pump())).toBe(0);
    expect(await h.coordinator.statusOf(expiring.taskId)).toBe("PENDING_REVIEW");
    expect(crew.cancelled).toHaveLength(1);

    const other = await h.coordinator.enqueue(eventOf({ channelId: "ch-b", platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    expect(await h.coordinator.statusOf(other.taskId)).toBe("RUNNING");
    expect(crew.maxOpen).toBe(2);
  });

  it("holds the slot of a batch whose cancel never answers, so the host never runs more sessions than the limit", async () => {
    const h = harnessWith({ limit: 1 });
    const crew = new HungCrew("cancel");
    const { executor } = executorFor(h, crew);
    const stuck = eventOf({ platformMessageId: "a1" });
    await h.coordinator.enqueue(stuck, h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    await withinMs(executor.cancelEvent(keyOfEvent(stuck)));

    const next = await h.coordinator.enqueue(eventOf({ platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(0);
    expect(await h.coordinator.statusOf(next.taskId)).toBe("QUEUED");

    crew.answerHungCancels();
    await flush();
    expect(await withinMs(executor.pump())).toBe(1);
    expect(await h.coordinator.statusOf(next.taskId)).toBe("RUNNING");
    expect(crew.maxOpen).toBe(1);
  });

  it("keeps the slot when Crew refuses a cancel, and sends the cancel again on the next pump", async () => {
    const h = harnessWith({ limit: 1 });
    const crew = new HungCrew("cancel");
    const { executor } = executorFor(h, crew);
    const stuck = eventOf({ platformMessageId: "a1" });
    await h.coordinator.enqueue(stuck, h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);

    crew.refuseNextCancel = true;
    await withinMs(executor.cancelEvent(keyOfEvent(stuck)));
    await flush();
    expect(crew.cancelled).toHaveLength(1);

    const next = await h.coordinator.enqueue(eventOf({ platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(0);
    expect(crew.cancelled).toHaveLength(2);
    expect(await h.coordinator.statusOf(next.taskId)).toBe("QUEUED");

    crew.answerHungCancels();
    await flush();
    expect(await withinMs(executor.pump())).toBe(1);
    expect(crew.maxOpen).toBe(1);
  });

  it("dispatches other channels while one start never answers, and returns from pump on time", async () => {
    const h = harnessWith({ limit: 2 });
    const crew = new HungCrew("start");
    const { executor } = executorFor(h, crew);
    const hung = await h.coordinator.enqueue(eventOf({ channelId: "ch-a", platformMessageId: "a1" }), h.clock.at(1000));
    expect(await withinMs(executor.pump())).toBe(1);

    const other = await h.coordinator.enqueue(eventOf({ channelId: "ch-b", platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    expect(await h.coordinator.statusOf(other.taskId)).toBe("RUNNING");

    h.clock.advance(1000);
    expect(await withinMs(executor.pump())).toBe(0);
    expect(await h.coordinator.reasonOf(hung.taskId)).toBe("DEADLINE_EXCEEDED");
    expect(crew.maxOpen).toBe(1);
  });

  it("frees the slot once Crew accepts a cancel, even though the session never reports", async () => {
    const h = harnessWith({ limit: 1 });
    const crew = new HungCrew("done");
    const { executor } = executorFor(h, crew);
    const first = eventOf({ platformMessageId: "a1" });
    await h.coordinator.enqueue(first, h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    await withinMs(executor.cancelEvent(keyOfEvent(first)));
    await flush();

    const next = await h.coordinator.enqueue(eventOf({ platformMessageId: "b1" }), h.clock.at(60_000));
    expect(await withinMs(executor.pump())).toBe(1);
    expect(await h.coordinator.statusOf(next.taskId)).toBe("RUNNING");
    expect(crew.maxOpen).toBe(1);
  });
});

/** VW-R-006: the Crew executor serves PAID and REALTIME. The review runner takes the BACKGROUND lane. */
describe("lanes shared with the review runner", () => {
  it("never starts a session for a background review task", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor, written } = executorFor(h, crew);
    const review = await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg" }), h.clock.at(60_000));

    expect(await executor.pump()).toBe(0);
    expect(crew.started).toEqual([]);
    expect(written).toEqual([]);
    expect(await h.coordinator.statusOf(review.taskId)).toBe("QUEUED");
  });

  it("starts realtime work and leaves a background review task queued in the same pump", async () => {
    const h = harnessWith({ limit: 4 });
    const crew = new FakeCrew();
    const { executor } = executorFor(h, crew);
    const realtime = await h.coordinator.enqueue(eventOf({ platformMessageId: "rt" }), h.clock.at(60_000));
    const review = await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg", platformOrder: 2 }), h.clock.at(60_000));

    expect(await executor.pump()).toBe(1);
    const job = firstJob(crew);
    expect(job.items.map((item) => item.taskId)).toEqual([realtime.taskId]);
    expect(await h.coordinator.statusOf(review.taskId)).toBe("QUEUED");

    crew.finish(crew.refFor(job.batchId), completedFor(job));
    await executor.drain();
  });
});
