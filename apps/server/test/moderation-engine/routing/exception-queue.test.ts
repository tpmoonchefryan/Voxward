import { describe, expect, it } from "vitest";
import {
  createInMemoryExceptionQueue,
  ExceptionQueueError,
  exceptionKeyOf,
} from "../../../src/modules/moderation-engine/routing/exception-queue.js";

describe("exception queue registration", () => {
  it("registers a message once and reports a repeat as existing", () => {
    const queue = createInMemoryExceptionQueue();
    const key = exceptionKeyOf({ channelId: "channel-1", platformMessageId: "message-1" });
    expect(queue.register(key, "correlation-1")).toBe("CREATED");
    expect(queue.register(key, "correlation-1")).toBe("EXISTING");
    expect(queue.openEntries()).toHaveLength(1);
  });

  it("keeps the channel and the platform message apart whatever characters they contain", () => {
    const first = exceptionKeyOf({ channelId: "a|b", platformMessageId: "c" });
    const second = exceptionKeyOf({ channelId: "a", platformMessageId: "b|c" });
    expect(first).not.toBe(second);
  });
});

describe("exception queue settlement", () => {
  it("closes an entry with its resolution and drops it from the open list", () => {
    const queue = createInMemoryExceptionQueue();
    const key = exceptionKeyOf({ channelId: "channel-1", platformMessageId: "message-1" });
    queue.register(key, "correlation-1");
    expect(queue.settle(key, "BASE_BLOCK")).toEqual({ key, correlationId: "correlation-1", resolution: "BASE_BLOCK" });
    expect(queue.openEntries()).toEqual([]);
  });

  it("keeps the first resolution when a later call tries to change it", () => {
    const queue = createInMemoryExceptionQueue();
    const key = exceptionKeyOf({ channelId: "channel-1", platformMessageId: "message-1" });
    queue.register(key, "correlation-1");
    queue.settle(key, "MODEL");
    expect(queue.settle(key, "MANUAL").resolution).toBe("MODEL");
  });

  it("refuses to settle an entry that was never registered", () => {
    const queue = createInMemoryExceptionQueue();
    expect(() => queue.settle(exceptionKeyOf({ channelId: "c", platformMessageId: "m" }), "MODEL")).toThrow(
      ExceptionQueueError,
    );
  });

  it("lists only the open entries, in registration order", () => {
    const queue = createInMemoryExceptionQueue();
    const keys = ["m-1", "m-2", "m-3"].map((platformMessageId) =>
      exceptionKeyOf({ channelId: "channel-1", platformMessageId }),
    );
    for (const [index, key] of keys.entries()) queue.register(key, `correlation-${index + 1}`);
    queue.settle(keys[1] ?? "", "DISCARDED");
    expect(queue.openEntries().map((entry) => entry.correlationId)).toEqual(["correlation-1", "correlation-3"]);
  });
});
