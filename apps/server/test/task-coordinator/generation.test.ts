import { describe, expect, it } from "vitest";
import { eventOf, harnessWith, keyOfEvent, mustTake, resultFor } from "./helpers.js";

/** Enqueues one event and starts it, so that its result can be committed. */
async function startedEvent(messageId = "msg-1") {
  const h = harnessWith();
  const event = eventOf({ platformMessageId: messageId });
  const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
  await mustTake(h.coordinator);
  return { h, event, taskId: ref.taskId };
}

describe("commit against the stored facts", () => {
  it("binds the task to the facts that held when it was enqueued", async () => {
    const h = harnessWith();
    const event = eventOf();
    h.facts.supersede(keyOfEvent(event));
    const ref = await h.coordinator.enqueue(event, h.clock.at(60_000));
    expect(ref.eventVersion).toBe(2);
    await mustTake(h.coordinator);
    expect(await h.coordinator.commitResult(ref.taskId, resultFor(ref.taskId))).toEqual({ status: "committed" });
  });

  it("refuses a result after a manual decision replaced the verdict", async () => {
    const { h, event, taskId } = await startedEvent();
    h.facts.supersede(keyOfEvent(event));
    expect(await h.coordinator.commitResult(taskId, resultFor(taskId))).toEqual({
      status: "discarded",
      reason: "VERSION_SUPERSEDED",
    });
    expect(h.facts.applied).toEqual([]);
    expect(await h.coordinator.statusOf(taskId)).toBe("DISCARDED");
  });

  it("refuses a result after the event's data was deleted", async () => {
    const { h, event, taskId } = await startedEvent();
    h.facts.deleteData(keyOfEvent(event));
    expect(await h.coordinator.commitResult(taskId, resultFor(taskId))).toEqual({
      status: "discarded",
      reason: "DATA_DELETED",
    });
    expect(h.facts.applied).toEqual([]);
  });

  it("refuses a result after the processing generation changed", async () => {
    const { h, event, taskId } = await startedEvent();
    h.facts.bumpGeneration(keyOfEvent(event));
    expect(await h.coordinator.commitResult(taskId, resultFor(taskId))).toEqual({
      status: "discarded",
      reason: "GENERATION_CHANGED",
    });
    expect(h.facts.applied).toEqual([]);
  });

  it("refuses a result that another writer already settled", async () => {
    const { h, event, taskId } = await startedEvent();
    h.facts.markSettled(keyOfEvent(event), taskId);
    expect(await h.coordinator.commitResult(taskId, resultFor(taskId))).toEqual({
      status: "discarded",
      reason: "ALREADY_SETTLED",
    });
    expect(h.facts.applied).toEqual([]);
  });

  it("moves the task to human review when the commit transaction fails, and writes nothing", async () => {
    const { h, taskId } = await startedEvent();
    h.facts.failNextCommit();
    expect(await h.coordinator.commitResult(taskId, resultFor(taskId))).toEqual({
      status: "failed",
      reason: "COMMIT_FAILED",
    });
    expect(h.facts.applied).toEqual([]);
    expect(await h.coordinator.statusOf(taskId)).toBe("PENDING_REVIEW");
    expect(await h.coordinator.reasonOf(taskId)).toBe("COMMIT_FAILED");
  });
});
