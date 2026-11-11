import { describe, expect, it } from "vitest";
import { createIdentityTracker, observeIdentity } from "../../../src/modules/platform-source/youtube/identity.js";
import { type AuthorFlags } from "../../../src/modules/platform-source/youtube/stream-list.js";
import { NOW_ISO } from "../youtube-stream/fixtures.js";

const NONE: AuthorFlags = { isChatOwner: false, isChatModerator: false, isChatSponsor: false, isVerified: false };
const T0 = NOW_ISO;

describe("identity mapping from platform flags", () => {
  it("maps each platform flag to its kind, and names the flag as evidence", () => {
    expect(observeIdentity({ ...NONE, isChatOwner: true })).toMatchObject({ kind: "CHANNEL_OWNER", certain: true, evidence: "isChatOwner" });
    expect(observeIdentity({ ...NONE, isChatModerator: true })).toMatchObject({ kind: "MODERATOR", certain: true, evidence: "isChatModerator" });
    expect(observeIdentity({ ...NONE, isChatSponsor: true })).toMatchObject({ kind: "PAID_MEMBER", certain: true, evidence: "isChatSponsor" });
    expect(observeIdentity({ ...NONE, isVerified: true })).toMatchObject({ kind: "VERIFIED_ACCOUNT", certain: true, evidence: "isVerified" });
  });

  it("gives the stronger evidence when several flags are true", () => {
    expect(observeIdentity({ ...NONE, isChatSponsor: true, isChatModerator: true }).kind).toBe("MODERATOR");
    expect(observeIdentity({ ...NONE, isVerified: true, isChatSponsor: true }).kind).toBe("PAID_MEMBER");
  });

  it("reports an ordinary viewer as UNKNOWN with certainty when every flag is explicitly false", () => {
    expect(observeIdentity(NONE)).toEqual({ kind: "UNKNOWN", certain: true, evidence: null, subscription: "NOT_PROVIDED" });
  });

  it("is uncertain, and so never a downgrade, when a flag is missing and nothing is true", () => {
    expect(observeIdentity({})).toMatchObject({ kind: "UNKNOWN", certain: false, evidence: null });
    expect(observeIdentity({ isChatOwner: false, isChatModerator: false, isChatSponsor: false })).toMatchObject({
      kind: "UNKNOWN",
      certain: false,
    });
  });

  it("never fabricates a subscription marker, whatever the flags say", () => {
    for (const flags of [NONE, { isChatSponsor: true }, {}]) {
      expect(observeIdentity(flags).subscription).toBe("NOT_PROVIDED");
    }
  });
});

describe("identity tracker", () => {
  const sponsor: AuthorFlags = { ...NONE, isChatSponsor: true };

  function seen(tracker: ReturnType<typeof createIdentityTracker>, flags: AuthorFlags, messageId: string, subjectKey = "sender-1") {
    return tracker.observe({
      channelId: "channel-a",
      subjectKey,
      observation: observeIdentity(flags),
      sourceEventRef: `youtube:${messageId}`,
      effectiveFrom: T0,
    });
  }

  it("reports the first certain identity, with the message as its source, and nothing for a repeat", () => {
    const tracker = createIdentityTracker({ capacity: 100 });

    expect(seen(tracker, sponsor, "m1")).toEqual({
      channelId: "channel-a",
      subjectKey: "sender-1",
      sourceEventRef: "youtube:m1",
      effectiveFrom: T0,
      nextKind: "PAID_MEMBER",
    });
    expect(seen(tracker, sponsor, "m2")).toBeNull();
  });

  it("reports an expiry as a certain change back to UNKNOWN", () => {
    const tracker = createIdentityTracker({ capacity: 100 });
    seen(tracker, sponsor, "m1");

    expect(seen(tracker, NONE, "m2")).toMatchObject({ nextKind: "UNKNOWN", sourceEventRef: "youtube:m2" });
  });

  it("reports nothing for an uncertain observation, and keeps the last certain kind", () => {
    const tracker = createIdentityTracker({ capacity: 100 });
    seen(tracker, sponsor, "m1");

    expect(seen(tracker, {}, "m2")).toBeNull();
    expect(seen(tracker, sponsor, "m3")).toBeNull();
  });

  it("reports an unknown subject once, even for an ordinary viewer, so the stored identity is checked", () => {
    const tracker = createIdentityTracker({ capacity: 100 });

    expect(seen(tracker, NONE, "m1", "new-viewer")).toMatchObject({ nextKind: "UNKNOWN" });
    expect(seen(tracker, NONE, "m2", "new-viewer")).toBeNull();
  });

  it("forgets the least recently seen subject once it is full, so that subject is reported again", () => {
    const tracker = createIdentityTracker({ capacity: 1 });
    seen(tracker, sponsor, "m1", "subject-a");
    seen(tracker, sponsor, "m2", "subject-b");

    expect(seen(tracker, sponsor, "m3", "subject-a")).toMatchObject({ nextKind: "PAID_MEMBER" });
  });

  it("refuses a capacity that is not a positive whole number", () => {
    expect(() => createIdentityTracker({ capacity: 0 })).toThrow(RangeError);
  });
});

/* VW-SUB036 Q42: a deletion forgets the identity the tracker holds, so the next certain identity is reported again. */
describe("identity tracker, forgetting one subject (Q42)", () => {
  it("reports the same certain identity again after the subject is forgotten, and only that subject", () => {
    const tracker = createIdentityTracker({ capacity: 10 });
    const moderator: AuthorFlags = { ...NONE, isChatModerator: true };
    const observe = (subjectKey: string, messageId: string) =>
      tracker.observe({
        channelId: "channel-a",
        subjectKey,
        observation: observeIdentity(moderator),
        sourceEventRef: `youtube:${messageId}`,
        effectiveFrom: T0,
      });
    observe("sender-1", "m1");
    observe("sender-2", "m2");
    expect(observe("sender-1", "m3")).toBeNull();

    expect(tracker.forget("sender-1")).toBe(1);
    expect(observe("sender-1", "m4")).not.toBeNull();
    expect(observe("sender-2", "m5")).toBeNull();
    expect(tracker.forget("sender-3")).toBe(0);
  });
});
