import { describe, expect, it } from "vitest";
import {
  DEFAULT_YOUTUBE_STREAM_CONFIG,
  resolveYouTubeQuotaConfig,
  resolveYouTubeStreamConfig,
  STREAM_LIST_QUOTA_UNITS,
  YouTubeConfigError,
} from "../../../src/modules/platform-source/youtube/config.js";
import { claimMessageId, createInMemoryMessageIdStore } from "../../../src/modules/platform-source/youtube/dedup.js";
import { classifyReplay } from "../../../src/modules/platform-source/youtube/replay-age.js";
import {
  parseStreamItem,
  reconnectDelayMs,
  reduceStream,
  type StreamState,
} from "../../../src/modules/platform-source/youtube/stream-list.js";
import { chatItem, NOW_ISO, NOW_MS } from "./fixtures.js";

const CONFIG = resolveYouTubeStreamConfig();
const IDLE: StreamState = { phase: "CONNECTING", pageToken: null, failures: 0, lastFailure: null };

describe("official item parsing", () => {
  it("keeps the fields the intake needs, and keeps author flags only when the platform sent a boolean", () => {
    const message = parseStreamItem(
      chatItem("m1", { type: "superChatEvent", author: { isChatSponsor: true, isChatOwner: "yes" } }),
    );

    expect(message).toMatchObject({
      platformMessageId: "m1",
      type: "superChatEvent",
      publishedAtMs: NOW_MS,
      text: "synthetic text m1",
      authorChannelId: "UC-synthetic-m1",
    });
    expect(message?.authorFlags).toEqual({
      isChatOwner: undefined,
      isChatModerator: undefined,
      isChatSponsor: true,
      isVerified: undefined,
    });
  });

  it("leaves the text empty when the item carries none, instead of filling it in", () => {
    const item = chatItem("m2");
    delete (item.snippet as Record<string, unknown>).textMessageDetails;

    expect(parseStreamItem(item)?.text).toBeNull();
  });

  it("reads a Super Chat comment from superChatDetails.userComment (Q40)", () => {
    const message = parseStreamItem(chatItem("sc1", { type: "superChatEvent", superChatComment: "synthetic comment" }));

    expect(message?.text).toBe("synthetic comment");
  });

  it("gives a null text for a Super Chat without a comment, and never reads a text field of another shape (Q40)", () => {
    expect(parseStreamItem(chatItem("sc2", { type: "superChatEvent", superChatComment: null }))?.text).toBeNull();

    // A Super Chat never carries textMessageDetails. The defect filled the body from it, and tests hid the defect.
    const misplaced = chatItem("sc3", { type: "superChatEvent", superChatComment: null });
    (misplaced.snippet as Record<string, unknown>).textMessageDetails = { messageText: "not a Super Chat comment" };
    expect(parseStreamItem(misplaced)?.text).toBeNull();
  });

  it.each([
    ["a non-official kind", { ...chatItem("m3"), kind: "youtube#liveChatMessageListResponse" }],
    ["a missing id", { ...chatItem("m4"), id: "" }],
    ["a missing snippet", { ...chatItem("m5"), snippet: undefined }],
    ["a missing author channel", { ...chatItem("m6"), authorDetails: { displayName: "x" } }],
    ["an unreadable time", chatItem("m7", { publishedAt: "yesterday-ish" })],
    ["a missing type", chatItem("m8", { type: "" })],
  ])("returns null for %s", (_label, raw) => {
    expect(parseStreamItem(raw)).toBeNull();
  });
});

describe("message ID store", () => {
  it("takes an ID once and reports the repeat as a duplicate", () => {
    const store = createInMemoryMessageIdStore(10);

    expect(claimMessageId(store, "a")).toBe("NEW");
    expect(claimMessageId(store, "a")).toBe("DUPLICATE");
    expect(claimMessageId(store, "b")).toBe("NEW");
  });

  it("forgets the oldest ID once it is full", () => {
    const store = createInMemoryMessageIdStore(2);
    claimMessageId(store, "a");
    claimMessageId(store, "b");
    claimMessageId(store, "c");

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);
    expect(store.has("c")).toBe(true);
  });

  it("refuses a capacity that is not a positive whole number", () => {
    expect(() => createInMemoryMessageIdStore(0)).toThrow(RangeError);
    expect(() => createInMemoryMessageIdStore(1.5)).toThrow(RangeError);
  });
});

describe("replay classification", () => {
  const replayMaxAgeMs = 300_000;

  it("is live inside the limit, including exactly at the limit", () => {
    expect(classifyReplay({ publishedAtMs: NOW_MS - 1_000, nowMs: NOW_MS, replayMaxAgeMs })).toBe("LIVE");
    expect(classifyReplay({ publishedAtMs: NOW_MS - replayMaxAgeMs, nowMs: NOW_MS, replayMaxAgeMs })).toBe("LIVE");
  });

  it("is a stale replay one millisecond past the limit", () => {
    expect(classifyReplay({ publishedAtMs: NOW_MS - replayMaxAgeMs - 1, nowMs: NOW_MS, replayMaxAgeMs })).toBe("STALE_REPLAY");
  });

  it("treats a timestamp in the future as live", () => {
    expect(classifyReplay({ publishedAtMs: NOW_MS + 60_000, nowMs: NOW_MS, replayMaxAgeMs })).toBe("LIVE");
  });
});

describe("reconnect delay", () => {
  it("doubles from the initial delay and stops at the maximum", () => {
    expect([1, 2, 3, 6, 7].map((failures) => reconnectDelayMs(failures, "network", CONFIG))).toEqual([
      1_000, 2_000, 4_000, 32_000, 60_000,
    ]);
  });

  it("raises a rate-limited delay to the floor, and never past the maximum", () => {
    expect(reconnectDelayMs(1, "rateLimitExceeded", CONFIG)).toBe(30_000);
    expect(reconnectDelayMs(6, "rateLimitExceeded", CONFIG)).toBe(32_000);
    expect(reconnectDelayMs(9, "rateLimitExceeded", CONFIG)).toBe(60_000);
  });
});

describe("stream reducer", () => {
  it("keeps the cursor when a batch carries no next token", () => {
    const first = reduceStream(IDLE, { kind: "RESPONSE", response: { items: [], nextPageToken: "t1" } }, CONFIG);
    const second = reduceStream(first.state, { kind: "RESPONSE", response: { items: [] } }, CONFIG);

    expect(second.state).toMatchObject({ phase: "STREAMING", pageToken: "t1", failures: 0 });
  });

  it("ends the stream when a batch carries an offline time, and still delivers that batch", () => {
    const step = reduceStream(IDLE, { kind: "RESPONSE", response: { items: [], offlineAt: NOW_ISO } }, CONFIG);

    expect(step.state.phase).toBe("ENDED");
    expect(step.actions).toEqual([{ kind: "DELIVER", response: { items: [], offlineAt: NOW_ISO } }]);
  });

  it("clears the cursor on an expired token, but only when there was one", () => {
    const withCursor = reduceStream({ ...IDLE, pageToken: "old" }, { kind: "FAILED", reason: "pageTokenInvalid" }, CONFIG);
    expect(withCursor.state).toMatchObject({ phase: "BACKOFF", pageToken: null });
    expect(withCursor.actions).toEqual([{ kind: "WAIT", delayMs: 0 }]);

    const withoutCursor = reduceStream(IDLE, { kind: "FAILED", reason: "pageTokenInvalid" }, CONFIG);
    expect(withoutCursor.state).toMatchObject({ phase: "BACKOFF", failures: 1, lastFailure: "pageTokenInvalid" });
    expect(withoutCursor.actions).toEqual([{ kind: "WAIT", delayMs: 1_000 }]);
  });
});

describe("intake configuration", () => {
  it("accepts the defaults and the quota constant from the official page", () => {
    expect(resolveYouTubeStreamConfig()).toEqual(DEFAULT_YOUTUBE_STREAM_CONFIG);
    expect(STREAM_LIST_QUOTA_UNITS).toBe(5);
  });

  it("names the key that is wrong and never a value", () => {
    expect(() => resolveYouTubeStreamConfig({ maxConsecutiveFailures: 0 })).toThrow(YouTubeConfigError);
    try {
      resolveYouTubeStreamConfig({ replayMaxAgeMs: -7 });
    } catch (error) {
      expect(error).toBeInstanceOf(YouTubeConfigError);
      expect((error as YouTubeConfigError).key).toBe("replayMaxAgeMs");
      expect((error as Error).message).not.toContain("-7");
    }
  });

  it("refuses an initial delay above the maximum, and a rate-limit floor above the maximum", () => {
    expect(() => resolveYouTubeStreamConfig({ reconnectMaxMs: 500 })).toThrow("reconnectInitialMs/reconnectMaxMs");
    expect(() => resolveYouTubeStreamConfig({ rateLimitFloorMs: 90_000 })).toThrow("rateLimitFloorMs/reconnectMaxMs");
  });

  it("validates the quota settings the same way", () => {
    expect(resolveYouTubeQuotaConfig()).toEqual({ dailyBudgetUnits: 10_000, warnRatio: 0.8 });
    expect(() => resolveYouTubeQuotaConfig({ dailyBudgetUnits: 0 })).toThrow("dailyBudgetUnits");
    expect(() => resolveYouTubeQuotaConfig({ warnRatio: 0 })).toThrow("warnRatio");
    expect(() => resolveYouTubeQuotaConfig({ warnRatio: 1.2 })).toThrow("warnRatio");
  });
});
