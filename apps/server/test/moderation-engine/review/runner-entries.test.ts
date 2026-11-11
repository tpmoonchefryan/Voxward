import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { MemoryReviewStore, messageOf, reviewHarness } from "./fixtures.js";

const CHANNEL = { channelId: "ch-1", streamEnded: false } as const;

/** Runs a full collection after the current macrotask, so no job still keeps a weakly held object alive. */
const gc = (() => {
  setFlagsFromString("--expose_gc");
  return runInNewContext("gc") as () => void;
})();

async function collectGarbage(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  gc();
  gc();
}

/** Seeds one message and returns a weak reference to its event, to see whether anything still holds the event. */
function seedWeakly(store: MemoryReviewStore, eventId: string, messageId: string, order: number, deadline: string | null): WeakRef<object> {
  const event = messageOf(messageId, { order, body: `private text of ${messageId}` });
  store.seed({ eventId, event, settlementDeadlineAt: deadline });
  return new WeakRef(event);
}

describe("entries of open review tasks (INHERIT-017)", () => {
  it("keeps one entry per open task and drops the entry of a task that a deletion cancelled", async () => {
    const { h, store, runner } = reviewHarness({ policy: { periodMs: 1000, countThreshold: 50, maxPerCycle: 50 } });
    store.seed({ eventId: "e-m1", event: messageOf("m1", { order: 1 }) });
    store.seed({ eventId: "e-m2", event: messageOf("m2", { order: 2 }) });
    await runner.runCycle(CHANNEL);
    expect(runner.retainedEntries()).toBe(2);

    await h.coordinator.cancelEvent({ channelId: "ch-1", platformMessageId: "m1" });
    store.forget("e-m1");
    await runner.runCycle(CHANNEL);

    expect(runner.retainedEntries()).toBe(1);
  });

  it("keeps no message text once its task was cancelled or expired in the coordinator", async () => {
    const { h, store, runner } = reviewHarness({ policy: { periodMs: 1000, countThreshold: 50, maxPerCycle: 50 } });
    const cancelled = seedWeakly(store, "e-m1", "m1", 1, null);
    const expired = seedWeakly(store, "e-m2", "m2", 2, h.clock.at(1000));
    await runner.runCycle(CHANNEL);

    await h.coordinator.cancelEvent({ channelId: "ch-1", platformMessageId: "m1" });
    h.clock.advance(5000);
    await h.coordinator.sweep();
    store.forget("e-m1");
    store.forget("e-m2");
    await runner.runCycle(CHANNEL);

    expect(runner.retainedEntries()).toBe(0);
    await collectGarbage();
    expect(cancelled.deref()).toBeUndefined();
    expect(expired.deref()).toBeUndefined();
  });
});
