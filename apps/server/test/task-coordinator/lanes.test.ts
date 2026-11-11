import { describe, expect, it } from "vitest";
import { eventOf, harnessWith } from "./helpers.js";

/**
 * VW-R-006: a caller takes only the lanes it serves. The review runner takes BACKGROUND, the Crew executor takes PAID and
 * REALTIME. Both use the same slots and the same background reserve.
 */
describe("takeBatch by lane", () => {
  it("takes only the lanes asked for, even when a higher lane is queued", async () => {
    const h = harnessWith({ limit: 4 });
    const paid = await h.coordinator.enqueueInLane("PAID", eventOf({ platformMessageId: "paid", platformOrder: 1 }), h.clock.at(60_000));
    const realtime = await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));
    await h.coordinator.enqueueInLane("BACKGROUND", eventOf({ platformMessageId: "bg", platformOrder: 3 }), h.clock.at(60_000));

    const batch = await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] });

    expect(batch?.lane).toBe("BACKGROUND");
    expect(batch?.tasks.map((task) => task.correlationId)).toEqual(["corr-ch-1-bg"]);
    expect(await h.coordinator.statusOf(paid.taskId)).toBe("QUEUED");
    expect(await h.coordinator.statusOf(realtime.taskId)).toBe("QUEUED");
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
    await h.coordinator.enqueue(eventOf({ platformMessageId: "rt", platformOrder: 2 }), h.clock.at(60_000));

    expect((await h.coordinator.takeBatch({ lanes: ["BACKGROUND"] }))?.lane).toBe("BACKGROUND");
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
