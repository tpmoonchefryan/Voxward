import { NATIVE_CLOSE, type OutputSubscriber } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createSubscriptionRegistry } from "../../../src/modules/output-adapter/subscription.js";

function fakeSubscriber(grantId: string, channelId: string) {
  const closes: Array<{ code: number; reason: string }> = [];
  const subscriber: OutputSubscriber = {
    grantId,
    channelId,
    send: async () => undefined,
    bufferedAmount: () => 0,
    close: (closing) => {
      closes.push({ code: closing.code, reason: closing.reason });
    },
  };
  return { subscriber, closes };
}

describe("subscriber registry (Q18: revocation closes the consumers of the grant)", () => {
  it("lists subscribers by channel and reports which channels have any", () => {
    const registry = createSubscriptionRegistry();
    const a = fakeSubscriber("grant-a", "channel-1").subscriber;
    const b = fakeSubscriber("grant-b", "channel-1").subscriber;
    const c = fakeSubscriber("grant-c", "channel-2").subscriber;
    registry.attach(a);
    registry.attach(b);
    registry.attach(c);

    expect(registry.forChannel("channel-1")).toEqual([a, b]);
    expect(registry.forChannel("channel-2")).toEqual([c]);
    expect([...registry.activeChannelIds()].sort()).toEqual(["channel-1", "channel-2"]);
  });

  it("closing a grant closes only its subscribers, with the grant-revoked code and reason, and removes them", () => {
    const registry = createSubscriptionRegistry();
    const revoked = fakeSubscriber("grant-a", "channel-1");
    const kept = fakeSubscriber("grant-b", "channel-1");
    registry.attach(revoked.subscriber);
    registry.attach(kept.subscriber);

    expect(registry.closeGrant("grant-a")).toBe(1);

    expect(revoked.closes).toEqual([{ code: NATIVE_CLOSE.GRANT_REVOKED.code, reason: "GRANT_REVOKED" }]);
    expect(kept.closes).toEqual([]);
    expect(registry.forChannel("channel-1")).toEqual([kept.subscriber]);
  });

  it("a detached subscriber is no longer listed, and closing an unknown grant closes nothing", () => {
    const registry = createSubscriptionRegistry();
    const only = fakeSubscriber("grant-a", "channel-1");
    registry.attach(only.subscriber);
    registry.detach(only.subscriber);

    expect(registry.forChannel("channel-1")).toEqual([]);
    expect(registry.closeGrant("grant-missing")).toBe(0);
    expect(only.closes).toEqual([]);
  });
});
