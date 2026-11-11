import { describe, expect, it } from "vitest";
import type { ChannelEvent, TaskRef } from "@voxward/contracts";
import {
  createTaskCoordinator,
  DEFAULT_COORDINATOR_LIMITS,
  TaskConfigError,
  TaskNotFoundError,
} from "../../src/modules/task-coordinator/index.js";
import { eventOf, FakeFacts, harnessWith, keyOfEvent, MutableConcurrency } from "./helpers.js";

/** Q38: settled records are a window of the newest `maxSettledRecords`, so the record count has a fixed bound. */

async function settledOne(
  coordinator: ReturnType<typeof harnessWith>["coordinator"],
  clockAt: (offset: number) => string,
  messageId: string,
  order: number,
): Promise<{ readonly ref: TaskRef; readonly event: ChannelEvent }> {
  const event = eventOf({ platformMessageId: messageId, platformOrder: order });
  const ref = await coordinator.enqueue(event, clockAt(60_000));
  await coordinator.cancelEvent(keyOfEvent(event));
  return { ref, event };
}

describe("settled record window (Q38)", () => {
  it("keeps only the newest maxSettledRecords settled records and forgets the oldest", async () => {
    const h = harnessWith({ limits: { maxSettledRecords: 3 } });
    const refs: TaskRef[] = [];
    for (let index = 0; index < 6; index += 1) {
      refs.push((await settledOne(h.coordinator, h.clock.at.bind(h.clock), `m${index}`, index + 1)).ref);
    }

    expect(h.coordinator.retainedRecords()).toBe(3);
    await expect(h.coordinator.statusOf(refs[0]?.taskId ?? "")).rejects.toBeInstanceOf(TaskNotFoundError);
    await expect(h.coordinator.statusOf(refs[2]?.taskId ?? "")).rejects.toBeInstanceOf(TaskNotFoundError);
    expect(await h.coordinator.statusOf(refs[3]?.taskId ?? "")).toBe("DISCARDED");
    expect(await h.coordinator.reasonOf(refs[5]?.taskId ?? "")).toBe("CANCELLED");
  });

  it("never drops an open task, even when settled records are over the window", async () => {
    const h = harnessWith({ limits: { maxSettledRecords: 3 } });
    const open = await h.coordinator.enqueue(eventOf({ platformMessageId: "open", platformOrder: 1 }), h.clock.at(60_000));
    for (let index = 0; index < 5; index += 1) {
      await settledOne(h.coordinator, h.clock.at.bind(h.clock), `s${index}`, index + 2);
    }

    expect(h.coordinator.retainedRecords()).toBe(4);
    expect(await h.coordinator.statusOf(open.taskId)).toBe("QUEUED");
  });

  it("returns the same task for a repeated event inside the window, and a new task after the record was forgotten", async () => {
    const h = harnessWith({ limits: { maxSettledRecords: 2 } });
    const repeated = eventOf({ platformMessageId: "repeat", platformOrder: 1 });
    const first = await h.coordinator.enqueue(repeated, h.clock.at(60_000));
    await h.coordinator.cancelEvent(keyOfEvent(repeated));
    expect((await h.coordinator.enqueue(repeated, h.clock.at(60_000))).taskId).toBe(first.taskId);

    await h.coordinator.cancelEvent(keyOfEvent(repeated));
    for (let index = 0; index < 2; index += 1) {
      await settledOne(h.coordinator, h.clock.at.bind(h.clock), `pad${index}`, index + 2);
    }
    const afterForget = await h.coordinator.enqueue(repeated, h.clock.at(60_000));
    expect(afterForget.taskId).not.toBe(first.taskId);
    expect(await h.coordinator.statusOf(afterForget.taskId)).toBe("QUEUED");
  });

  it("bounds the records by the default window", async () => {
    const h = harnessWith();
    for (let index = 0; index < DEFAULT_COORDINATOR_LIMITS.maxSettledRecords + 5; index += 1) {
      await settledOne(h.coordinator, h.clock.at.bind(h.clock), `d${index}`, index + 1);
    }

    expect(DEFAULT_COORDINATOR_LIMITS.maxSettledRecords).toBe(5000);
    expect(h.coordinator.retainedRecords()).toBe(DEFAULT_COORDINATOR_LIMITS.maxSettledRecords);
  });

  it("refuses a window below one", () => {
    expect(() =>
      createTaskCoordinator({
        facts: new FakeFacts(),
        concurrency: new MutableConcurrency(1),
        limits: { maxSettledRecords: 0 },
      }),
    ).toThrow(TaskConfigError);
  });
});
