import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CONTRACT_VERSION } from "@voxward/contracts";
import { resolveYouTubeQuotaConfig, resolveYouTubeStreamConfig } from "../../../src/modules/platform-source/youtube/config.js";
import { createInMemoryMessageIdStore } from "../../../src/modules/platform-source/youtube/dedup.js";
import { createIdentityTracker } from "../../../src/modules/platform-source/youtube/identity.js";
import { createQuotaMonitor } from "../../../src/modules/platform-source/youtube/quota.js";
import {
  type AcceptedStreamMessage,
  type ConnectGate,
  parseStreamItem,
  runStreamList,
} from "../../../src/modules/platform-source/youtube/stream-list.js";
import {
  type BusinessEventDeps,
  type BusinessOutput,
  toBusinessEvent,
} from "../../../src/modules/platform-source/youtube/to-business-event.js";
import {
  chatItem,
  failed,
  LIVE_CHAT_ID,
  NOW_ISO,
  NOW_MS,
  response,
  scriptedTransport,
} from "../youtube-stream/fixtures.js";

/** A keyed-hash stand-in for the composition layer's sender derivation. The raw platform ID never appears in the output. */
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function depsWith(overrides: Partial<BusinessEventDeps> = {}): BusinessEventDeps {
  let ids = 0;
  return {
    channelId: "channel-a",
    senderRefOf: hash,
    newId: () => {
      ids += 1;
      return `corr-${ids}`;
    },
    identities: createIdentityTracker({ capacity: 100 }),
    ...overrides,
  };
}

function acceptedOf(raw: unknown, order: number): AcceptedStreamMessage {
  const message = parseStreamItem(raw);
  if (message === null) throw new Error("the test item must be an official message");
  return { message, order, receivedAtMs: NOW_MS };
}

describe("business events from accepted messages", () => {
  it("turns an accepted message into a versioned ChannelEvent that carries no raw platform channel ID", () => {
    const output = toBusinessEvent(
      acceptedOf(chatItem("m1", { type: "superChatEvent", author: { isChatSponsor: true } }), 7),
      depsWith(),
    );

    expect(output.message).toMatchObject({ contractVersion: CONTRACT_VERSION, kind: "CHANNEL_MESSAGE" });
    expect(output.message.event).toEqual({
      contractVersion: CONTRACT_VERSION,
      platform: "youtube",
      channelId: "channel-a",
      platformMessageId: "m1",
      platformOrder: 7,
      receivedAt: NOW_ISO,
      correlationId: "corr-1",
      body: "synthetic text m1",
      sender: { contractVersion: CONTRACT_VERSION, senderRef: hash("UC-synthetic-m1") },
    });
    expect(JSON.stringify(output.message)).not.toContain("UC-synthetic-m1");
  });

  it("gives an empty body for a message that carries no text", () => {
    const item = chatItem("m2");
    delete (item.snippet as Record<string, unknown>).textMessageDetails;

    expect(toBusinessEvent(acceptedOf(item, 1), depsWith()).message.event.body).toBe("");
  });

  it("gives an empty body for a Super Chat without a comment (Q40)", () => {
    const item = chatItem("sc-none", { type: "superChatEvent", superChatComment: null });

    expect(toBusinessEvent(acceptedOf(item, 1), depsWith()).message.event.body).toBe("");
  });

  it("emits an identity change for a new certain identity, and none for a missing flag", () => {
    const deps = depsWith();
    const member = toBusinessEvent(acceptedOf(chatItem("m3", { author: { isChatSponsor: true } }), 1), deps);
    const uncertain = toBusinessEvent(acceptedOf(chatItem("m4", { author: { isChatSponsor: undefined } }), 2), deps);

    expect(member.identityChange).toEqual({
      channelId: "channel-a",
      subjectKey: hash("UC-synthetic-m3"),
      sourceEventRef: "youtube:m3",
      effectiveFrom: NOW_ISO,
      nextKind: "PAID_MEMBER",
    });
    expect(uncertain.message.identity).toMatchObject({ kind: "UNKNOWN", certain: false });
    expect(uncertain.identityChange).toBeNull();
  });
});

describe("intake run feeding the pipeline", () => {
  it("delivers versioned events once, reports one identity change, and shows quota exhaustion", async () => {
    const outputs: BusinessOutput[] = [];
    const deps = depsWith();
    const quota = createQuotaMonitor({
      config: resolveYouTubeQuotaConfig({ dailyBudgetUnits: 10, warnRatio: 0.8 }),
      now: () => NOW_MS,
    });
    const gate: ConnectGate = quota;
    const transport = scriptedTransport([
      [
        response(
          [
            chatItem("m1", { type: "superChatEvent", author: { isChatSponsor: true } }),
            chatItem("m2", { author: { channelId: "UC-synthetic-m1", isChatSponsor: true } }),
          ],
          { nextPageToken: "tok-1" },
        ),
        failed("network"),
      ],
      [response([chatItem("m1", { type: "superChatEvent", author: { isChatSponsor: true } })], { nextPageToken: "tok-2" })],
    ]);

    const result = await runStreamList({
      liveChatId: LIVE_CHAT_ID,
      transport,
      config: resolveYouTubeStreamConfig(),
      dedupe: createInMemoryMessageIdStore(100),
      sink: { deliver: (accepted) => void outputs.push(toBusinessEvent(accepted, deps)) },
      gate,
      now: () => NOW_MS,
      sleep: async () => undefined,
    });

    expect(outputs.map((output) => output.message.event.platformMessageId)).toEqual(["m1", "m2"]);
    expect(outputs.map((output) => output.message.event.platformOrder)).toEqual([1, 2]);
    expect(outputs.filter((output) => output.identityChange !== null)).toHaveLength(1);
    expect(result).toMatchObject({ phase: "QUOTA_EXHAUSTED", stats: { delivered: 2, duplicate: 1 } });
    expect(quota.snapshot()).toMatchObject({ usedUnits: 10, state: "EXHAUSTED" });
  });
});
