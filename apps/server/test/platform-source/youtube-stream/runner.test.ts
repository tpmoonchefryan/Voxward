import { describe, expect, it } from "vitest";
import { resolveYouTubeStreamConfig } from "../../../src/modules/platform-source/youtube/config.js";
import { createInMemoryMessageIdStore } from "../../../src/modules/platform-source/youtube/dedup.js";
import {
  type AcceptedStreamMessage,
  type ConnectGate,
  type StreamFailureReason,
  type TransportEvent,
  runStreamList,
} from "../../../src/modules/platform-source/youtube/stream-list.js";
import {
  chatItem,
  failed,
  idsOf,
  LIVE_CHAT_ID,
  minutesBefore,
  NOW_ISO,
  NOW_MS,
  recordingSink,
  recordingSleep,
  response,
  scriptedTransport,
} from "./fixtures.js";

const CONFIG = resolveYouTubeStreamConfig();

interface RunOptions {
  readonly gate?: ConnectGate;
  readonly resumeToken?: string | null;
  readonly firstOrder?: number;
  /** Returns true once the run should stop. It receives what was delivered so far. */
  readonly stopWhen?: (delivered: readonly AcceptedStreamMessage[]) => boolean;
}

async function run(connections: readonly (readonly TransportEvent[])[], options: RunOptions = {}) {
  const transport = scriptedTransport(connections);
  const { sink, accepted } = recordingSink();
  const { sleep, delays } = recordingSleep();
  const result = await runStreamList({
    liveChatId: LIVE_CHAT_ID,
    transport,
    config: CONFIG,
    dedupe: createInMemoryMessageIdStore(100),
    sink,
    now: () => NOW_MS,
    sleep,
    gate: options.gate,
    resumeToken: options.resumeToken,
    firstOrder: options.firstOrder,
    isStopRequested: options.stopWhen === undefined ? undefined : () => options.stopWhen?.(accepted) === true,
  });
  return { result, accepted, delays, requests: transport.requests };
}

describe("streamList intake", () => {
  it("delivers each message once across a reconnect, and resumes from the last cursor", async () => {
    const { result, accepted, delays, requests } = await run([
      [
        response([chatItem("m1", { type: "superChatEvent" }), chatItem("m2")], { nextPageToken: "tok-1" }),
        failed("network"),
      ],
      [
        response(
          [chatItem("m1", { type: "superChatEvent" }), chatItem("m2"), chatItem("m3")],
          { nextPageToken: "tok-2", offlineAt: NOW_ISO },
        ),
      ],
    ]);

    expect(requests).toEqual([null, "tok-1"]);
    expect(idsOf(accepted)).toEqual(["m1", "m2", "m3"]);
    expect(accepted.map((entry) => entry.order)).toEqual([1, 2, 3]);
    expect(result).toMatchObject({
      phase: "ENDED",
      pageToken: "tok-2",
      stats: { connections: 2, delivered: 3, duplicate: 2, staleReplay: 0, malformed: 0 },
    });
    expect(delays).toEqual([CONFIG.reconnectInitialMs]);
  });

  it("does not deliver a message published before the replay limit, and does not look at its ID again", async () => {
    const { result, accepted } = await run([
      [
        response(
          [
            chatItem("old-sc", { type: "superChatEvent", publishedAt: minutesBefore(10) }),
            chatItem("fresh", { publishedAt: minutesBefore(1) }),
          ],
          { nextPageToken: "t1" },
        ),
        response([chatItem("old-sc", { type: "superChatEvent", publishedAt: minutesBefore(10) })], { offlineAt: NOW_ISO }),
      ],
    ]);

    expect(idsOf(accepted)).toEqual(["fresh"]);
    expect(result.stats).toMatchObject({ delivered: 1, staleReplay: 1, duplicate: 1 });
  });

  it("delivers a message once when its ID repeats inside one batch", async () => {
    const { result, accepted } = await run([[response([chatItem("a"), chatItem("a"), chatItem("b")], { offlineAt: NOW_ISO })]]);

    expect(idsOf(accepted)).toEqual(["a", "b"]);
    expect(result.stats).toMatchObject({ delivered: 2, duplicate: 1 });
  });

  it("drops items that are not official chat messages or lack a field the intake needs, and counts them", async () => {
    const { result, accepted } = await run([
      [
        response(
          [
            { kind: "youtube#video", id: "video-1" },
            chatItem("no-author", { omitAuthor: true }),
            chatItem("bad-time", { publishedAt: "not-a-time" }),
            null,
            chatItem("ok"),
          ],
          { offlineAt: NOW_ISO },
        ),
      ],
    ]);

    expect(idsOf(accepted)).toEqual(["ok"]);
    expect(result.stats).toMatchObject({ delivered: 1, malformed: 4 });
  });

  it("treats a connection that ends without a reason as a dropped connection, and retries after the initial delay", async () => {
    const { result, accepted, delays, requests } = await run([[], [response([chatItem("m1")], { offlineAt: NOW_ISO })]]);

    expect(requests).toEqual([null, null]);
    expect(idsOf(accepted)).toEqual(["m1"]);
    expect(delays).toEqual([CONFIG.reconnectInitialMs]);
    expect(result.phase).toBe("ENDED");
  });

  it("grows the reconnect delay with each consecutive failure, caps it, and gives up at the limit", async () => {
    const connections = Array.from({ length: CONFIG.maxConsecutiveFailures }, () => [failed("network")] as const);

    const { result, delays, requests } = await run(connections);

    expect(delays).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000]);
    expect(requests).toHaveLength(CONFIG.maxConsecutiveFailures);
    expect(result).toMatchObject({ phase: "GAVE_UP", lastFailure: "network", stats: { connections: 8 } });
  });

  it("waits at least the rate-limit floor after a rate-limit answer, even on the first failure", async () => {
    const { delays, result } = await run([[failed("rateLimitExceeded")], [response([], { offlineAt: NOW_ISO })]]);

    expect(delays).toEqual([CONFIG.rateLimitFloorMs]);
    expect(result.phase).toBe("ENDED");
  });

  it("resets the failure count when a connection delivered a batch, so isolated drops keep the short delay", async () => {
    const { delays, result } = await run([
      [response([chatItem("a")], { nextPageToken: "t1" }), failed("network")],
      [response([chatItem("b")], { nextPageToken: "t2" }), failed("network")],
      [response([chatItem("c")], { offlineAt: NOW_ISO })],
    ]);

    expect(delays).toEqual([1_000, 1_000]);
    expect(result.phase).toBe("ENDED");
  });

  it("drops an expired cursor, starts an initial connection, and lets dedupe absorb what comes back", async () => {
    const { accepted, delays, requests, result } = await run([
      [response([chatItem("m1")], { nextPageToken: "t1" }), failed("pageTokenInvalid")],
      [response([chatItem("m1"), chatItem("m2")], { offlineAt: NOW_ISO })],
    ]);

    expect(requests).toEqual([null, null]);
    expect(idsOf(accepted)).toEqual(["m1", "m2"]);
    expect(result.stats.duplicate).toBe(1);
    expect(delays).toEqual([0]);
  });

  it.each([
    ["liveChatEnded", "ENDED"],
    ["liveChatDisabled", "CHAT_UNAVAILABLE"],
    ["liveChatNotFound", "CHAT_UNAVAILABLE"],
    ["forbidden", "PERMISSION_LOST"],
    ["invalidArgument", "REQUEST_REJECTED"],
  ] as const)("stops without retrying when the platform answers %s", async (reason: StreamFailureReason, phase) => {
    const { result, delays, requests } = await run([[failed(reason)]]);

    expect(result).toMatchObject({ phase, lastFailure: reason });
    expect(requests).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it("stops before any connection when the gate has no budget left", async () => {
    const gate: ConnectGate = {
      allowConnect: () => false,
      onConnect: () => {
        throw new Error("no connection may be made without budget");
      },
      onQuotaExceeded: () => undefined,
    };

    const { result, requests } = await run([[response([chatItem("m1")], { offlineAt: NOW_ISO })]], { gate });

    expect(result).toMatchObject({ phase: "QUOTA_EXHAUSTED", stats: { connections: 0 } });
    expect(requests).toEqual([]);
  });

  it("tells the gate about each connection and about a quota answer from the platform, then stops", async () => {
    const seen = { connects: 0, exhausted: 0 };
    const gate: ConnectGate = {
      allowConnect: () => true,
      onConnect: () => {
        seen.connects += 1;
      },
      onQuotaExceeded: () => {
        seen.exhausted += 1;
      },
    };

    const { result } = await run([[failed("quotaExceeded")]], { gate });

    expect(result).toMatchObject({ phase: "QUOTA_EXHAUSTED", lastFailure: "quotaExceeded" });
    expect(seen).toEqual({ connects: 1, exhausted: 1 });
  });

  it("stops in phase STOPPED as soon as a stop is requested, even inside a stream", async () => {
    const { result, accepted, requests } = await run(
      [[response([chatItem("m1")], { nextPageToken: "t1" }), response([chatItem("m2")], { nextPageToken: "t2" })]],
      { stopWhen: (delivered) => delivered.length >= 1 },
    );

    expect(idsOf(accepted)).toEqual(["m1"]);
    expect(result).toMatchObject({ phase: "STOPPED", pageToken: "t1" });
    expect(requests).toEqual([null]);
  });

  it("numbers delivered messages from firstOrder, and reports the number the next one would get", async () => {
    const { result, accepted } = await run([[response([chatItem("m1"), chatItem("m2")], { offlineAt: NOW_ISO })]], {
      firstOrder: 10,
    });

    expect(accepted.map((entry) => entry.order)).toEqual([10, 11]);
    expect(result.nextOrder).toBe(12);
  });

  it("resumes from a stored cursor when the caller provides one", async () => {
    const { requests } = await run([[response([], { offlineAt: NOW_ISO })]], { resumeToken: "stored-token" });

    expect(requests).toEqual(["stored-token"]);
  });
});
