import type { DeliverFrame, WardBlockedFrame } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import {
  BLIVECHAT_CMD,
  BLIVECHAT_PROTOCOL_VERSION,
  createBlivechatAdapter,
  mapDeliverToAddText,
  mapDeliverToSuperChat,
  mapWardBlockedToBlivechat,
} from "../../../src/modules/output/index.js";

const SAMPLE_DELIVER: DeliverFrame = {
  type: "DELIVER",
  version: 1,
  deliveryId: "del-101",
  deliverySequence: 1,
  platformOrder: 12,
  validUntil: "2099-01-01T00:00:00.000Z",
  display: {
    label: null,
    text: "Hello stream!",
    translation: "你好直播间！",
  },
};

const SAMPLE_BLOCKED: WardBlockedFrame = {
  type: "WARD_BLOCKED",
  version: 1,
  deliveryId: "del-102",
  deliverySequence: 2,
  platformOrder: 13,
  validUntil: "2099-01-01T00:00:00.000Z",
};

describe("blivechat frames & session adapter", () => {
  it("maps DELIVER to ADD_TEXT with text and translation and without identity or internal scores", () => {
    const frame = mapDeliverToAddText(SAMPLE_DELIVER, "2026-11-14T00:00:00.000Z");
    expect(frame).toEqual({
      cmd: BLIVECHAT_CMD.ADD_TEXT,
      data: {
        id: "del-101",
        authorName: "",
        content: "Hello stream!",
        translation: "你好直播间！",
        timestamp: "2026-11-14T00:00:00.000Z",
        privilegeType: 0,
      },
    });
    const keys = Object.keys(frame.data);
    expect(keys).not.toContain("uid");
    expect(keys).not.toContain("score");
    expect(keys).not.toContain("audit");
    expect(keys).not.toContain("correlationId");
  });

  it("maps DELIVER to ADD_SUPER_CHAT with text and translation", () => {
    const frame = mapDeliverToSuperChat(SAMPLE_DELIVER, "2026-11-14T00:00:00.000Z", 50);
    expect(frame).toEqual({
      cmd: BLIVECHAT_CMD.ADD_SUPER_CHAT,
      data: {
        id: "del-101",
        authorName: "",
        content: "Hello stream!",
        translation: "你好直播间！",
        price: 50,
        timestamp: "2026-11-14T00:00:00.000Z",
      },
    });
  });

  it("safely ignores WARD_BLOCKED without leaking original text or identity", () => {
    expect(mapWardBlockedToBlivechat(SAMPLE_BLOCKED)).toBeNull();
  });

  it("handles JOIN_ROOM, HEARTBEAT -> HEARTBEAT_REPLY, and rejects client chat uploads", () => {
    const adapter = createBlivechatAdapter();
    const session = adapter.createSession();

    expect(session.isJoined()).toBe(false);
    expect(session.mapNativeFrame(SAMPLE_DELIVER, "2026-11-14T00:00:00.000Z")).toBeNull();

    const joinAction = session.handleClientMessage(
      JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: "channel-a" } }),
      "2026-11-14T00:00:00.000Z",
    );
    expect(joinAction).toEqual({ kind: "joined" });
    expect(session.isJoined()).toBe(true);

    const hbAction = session.handleClientMessage(
      JSON.stringify({ cmd: BLIVECHAT_CMD.HEARTBEAT }),
      "2026-11-14T00:00:01.000Z",
    );
    expect(hbAction).toEqual({
      kind: "reply",
      frame: {
        cmd: BLIVECHAT_CMD.HEARTBEAT_REPLY,
        data: {
          protocol: BLIVECHAT_PROTOCOL_VERSION,
          timestamp: "2026-11-14T00:00:01.000Z",
        },
      },
    });

    const mappedDeliver = session.mapNativeFrame(SAMPLE_DELIVER, "2026-11-14T00:00:02.000Z");
    expect(mappedDeliver?.cmd).toBe(BLIVECHAT_CMD.ADD_TEXT);
    expect(session.mapNativeFrame(SAMPLE_BLOCKED, "2026-11-14T00:00:03.000Z")).toBeNull();

    const uploadAttempt = session.handleClientMessage(
      JSON.stringify({ cmd: 99, text: "spoofed upload" }),
      "2026-11-14T00:00:04.000Z",
    );
    expect(uploadAttempt.kind).toBe("reject");
  });

  it("maps DELIVER with display.payment to ADD_SUPER_CHAT while keeping authorName empty", () => {
    const adapter = createBlivechatAdapter();
    const session = adapter.createSession();
    session.handleClientMessage(
      JSON.stringify({ cmd: BLIVECHAT_CMD.JOIN_ROOM, data: { roomId: "channel-a" } }),
      "2026-11-14T00:00:00.000Z",
    );
    const frame = session.mapNativeFrame(
      {
        ...SAMPLE_DELIVER,
        display: {
          ...SAMPLE_DELIVER.display,
          translations: [
            { language: "zh-Hans", translatedText: "你好直播间！" },
            { language: "ja", translatedText: "こんにちは！" },
          ],
          payment: { amountMicros: 10_000_000, currency: "USD", amountDisplay: "$10.00", tier: 4 },
        },
      },
      "2026-11-14T00:00:02.000Z",
    );
    expect(frame).toEqual({
      cmd: BLIVECHAT_CMD.ADD_SUPER_CHAT,
      data: {
        id: "del-101",
        authorName: "",
        content: "Hello stream!",
        translation: "你好直播间！",
        translations: [
          { language: "zh-Hans", translatedText: "你好直播间！" },
          { language: "ja", translatedText: "こんにちは！" },
        ],
        price: 10,
        currency: "USD",
        amountDisplay: "$10.00",
        tier: 4,
        timestamp: "2026-11-14T00:00:02.000Z",
      },
    });
  });
});
