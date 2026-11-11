import type { TaskStatus } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import type { TaskBatch, TaskLane } from "../../src/modules/task-coordinator/index.js";
import { eventOf, harnessWith, resultFor } from "./helpers.js";

/**
 * VW-R-006: a caller takes only the lanes it serves. The review runner takes BACKGROUND, the Crew executor takes PAID and
 * REALTIME. Both use the same slots and the same background reserve. PAID and REALTIME keep their priority over
 * BACKGROUND whichever caller asks first (B6).
 */
describe("takeBatch by lane", () => {
  it("gives a background-only caller nothing while PAID or REALTIME work is ready", async () => {
    const h = harnessWith({ limit: 4 });
    const paid = await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 1 }), h.clock.at(60_000));
    const realtime = await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));
    const background = await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg", platformOrder: 3 }), h.clock.at(60_000));

    expect(await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] })).toBeNull();

    expect(await h.coordinator.statusOf(paid.taskId)).toBe("QUEUED");
    expect(await h.coordinator.statusOf(realtime.taskId)).toBe("QUEUED");
    expect(await h.coordinator.statusOf(background.taskId)).toBe("QUEUED");
  });

  it("gives the background batch once the PAID and REALTIME batches are taken", async () => {
    const h = harnessWith({ limit: 4 });
    await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 1 }), h.clock.at(60_000));
    await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg", platformOrder: 3 }), h.clock.at(60_000));

    expect((await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] }))?.lane).toBe("PAID");
    expect((await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] }))?.lane).toBe("REALTIME");
    const batch = await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] });

    expect(batch?.lane).toBe("BACKGROUND");
    expect(batch?.tasks.map((task) => task.correlationId)).toEqual(["corr-ch-1-bg"]);
  });

  it("holds a lower lane back only while the higher lane's batch is ready, not while it waits for its window", async () => {
    const h = harnessWith({ limit: 4, limits: { maxBatchWaitMs: 200 } });
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg-1", platformOrder: 1 }), h.clock.at(60_000));
    h.clock.advance(150);
    const realtime = await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));
    h.clock.advance(50);

    // The background window has elapsed (200 ms). The realtime window has not (50 ms of 200).
    expect((await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] }))?.lane).toBe("BACKGROUND");
    expect(await h.coordinator.statusOf(realtime.taskId)).toBe("QUEUED");

    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg-2", platformOrder: 3 }), h.clock.at(60_000));
    h.clock.advance(200);

    // Now the realtime batch is ready, so the next background batch waits for the caller that serves it.
    expect(await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] })).toBeNull();
    expect((await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] }))?.lane).toBe("REALTIME");
    expect((await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] }))?.lane).toBe("BACKGROUND");
  });

  it("holds back every lower lane behind a ready lane the caller does not serve", async () => {
    const h = harnessWith({ limit: 4 });
    await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 1 }), h.clock.at(60_000));
    await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));

    expect(await h.coordinator.takeBatch({ lanes: ["REALTIME"] })).toBeNull();
    expect((await h.coordinator.takeBatch({ lanes: ["PAID"] }))?.lane).toBe("PAID");
    expect((await h.coordinator.takeBatch({ lanes: ["REALTIME"] }))?.lane).toBe("REALTIME");
  });

  it("returns nothing for the interactive lanes while only background work is queued", async () => {
    const h = harnessWith({ limit: 4 });
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg" }), h.clock.at(60_000));

    expect(await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] })).toBeNull();
  });

  it("keeps the dispatch order PAID before REALTIME, whatever order the caller lists", async () => {
    const h = harnessWith({ limit: 4 });
    await h.coordinator.enqueue(eventOf({ platformMessageId: "rt" }), h.clock.at(60_000));
    await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 2 }), h.clock.at(60_000));

    expect((await h.coordinator.takeBatch({ lanes: ["REALTIME", "PAID"] }))?.lane).toBe("PAID");
  });

  it("lets realtime work take a slot while a background batch holds one", async () => {
    const h = harnessWith({ limit: 2, limits: { maxBatchItems: 1 } });
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg" }), h.clock.at(60_000));
    expect((await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] }))?.lane).toBe("BACKGROUND");
    await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));

    expect((await h.coordinator.takeBatch({ lanes: ["PAID", "REALTIME"] }))?.lane).toBe("REALTIME");
    expect(await h.coordinator.takeBatch()).toBeNull();
  });

  it("keeps the background ceiling for the review lane", async () => {
    const h = harnessWith({ limit: 2, limits: { maxBatchItems: 1 } });
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg-1" }), h.clock.at(60_000));
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg-2", platformOrder: 2 }), h.clock.at(60_000));

    expect((await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] }))?.tasks).toHaveLength(1);
    expect(await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] })).toBeNull();
  });
});

type CallOrder = "single caller" | "Crew executor first" | "review runner first";

const TICK_MS = 1000;
const BACKLOG_SIZE = 8;

interface BacklogOutcome {
  /** One entry per tick: R for each PAID or REALTIME batch started, B for each BACKGROUND batch started. */
  readonly starts: readonly string[];
  readonly realtime: readonly TaskStatus[];
}

/**
 * Replays a backlog on one coordinator, as E62 of the m6r1 acceptance did: limit 4, one task per batch, 8 REALTIME tasks
 * due in 2.5 s and 8 BACKGROUND tasks queued together. Each tick the callers take batches in the given order until they
 * get nothing. A batch holds its slot for one tick (1 s) and then commits.
 */
async function replayBacklog(order: CallOrder): Promise<BacklogOutcome> {
  const h = harnessWith({ limit: 4, limits: { maxBatchItems: 1 } });
  const realtimeIds: string[] = [];
  for (let index = 0; index < BACKLOG_SIZE; index += 1) {
    const event = eventOf({ platformMessageId: `rt-${index}`, platformOrder: 100 + index, senderRef: `rt-viewer-${index}` });
    realtimeIds.push((await h.coordinator.enqueueInLane("REALTIME", event, h.clock.at(2500))).taskId);
  }
  for (let index = 0; index < BACKLOG_SIZE; index += 1) {
    const event = eventOf({ platformMessageId: `bg-${index}`, platformOrder: 200 + index, senderRef: `bg-viewer-${index}` });
    await h.coordinator.enqueueInLane("BACKGROUND", event, h.clock.at(600_000));
  }

  const starts: string[] = [];
  for (let tick = 0; tick < 30; tick += 1) {
    const held: TaskBatch[] = [];
    const takeAll = async (lanes?: readonly TaskLane[]): Promise<void> => {
      const options = lanes === undefined ? undefined : { lanes };
      let batch = await h.coordinator.takeBatch(options);
      while (batch !== null) {
        held.push(batch);
        batch = await h.coordinator.takeBatch(options);
      }
    };
    if (order === "review runner first") {
      await takeAll(["BACKGROUND"]);
      await takeAll(["PAID", "REALTIME"]);
    } else if (order === "Crew executor first") {
      await takeAll(["PAID", "REALTIME"]);
      await takeAll(["BACKGROUND"]);
    } else {
      await takeAll();
    }
    if (held.length === 0) break;
    starts.push(held.map((batch) => (batch.lane === "BACKGROUND" ? "B" : "R")).join(""));

    h.clock.advance(TICK_MS);
    for (const batch of held) {
      for (const task of batch.tasks) await h.coordinator.commitResult(task.taskId, resultFor(task.taskId));
      await h.coordinator.finishBatch(batch.batchId);
    }
    await h.coordinator.sweep();
  }
  return { starts, realtime: await Promise.all(realtimeIds.map((taskId) => h.coordinator.statusOf(taskId))) };
}

/** B6: with the review runner and the Crew executor on one coordinator, the call order must not change who runs first. */
describe("takeBatch across two callers", () => {
  it("serves the REALTIME backlog first when one caller takes every lane", async () => {
    const single = await replayBacklog("single caller");

    expect(single.starts).toEqual(["RRRR", "RRRR", "BBB", "BBB", "BB"]);
    expect(single.realtime).toEqual(Array(BACKLOG_SIZE).fill("DONE"));
  });

  it.each<CallOrder>(["Crew executor first", "review runner first"])(
    "gives the same result as one caller when the %s",
    async (order) => {
      const single = await replayBacklog("single caller");

      const outcome = await replayBacklog(order);

      expect(outcome.starts).toEqual(single.starts);
      expect(outcome.realtime.filter((status) => status === "DONE")).toHaveLength(BACKLOG_SIZE);
      expect(outcome.realtime.filter((status) => status === "PENDING_REVIEW")).toHaveLength(0);
    },
  );
});
