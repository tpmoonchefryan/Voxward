import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createNicknameReader } from "../../../src/modules/moderation-engine/index.js";
import {
  createInProcessSafeAliases,
  resolveNicknameReading,
} from "../../../src/modules/moderation-engine/nickname-cache/safe-alias.js";
import type { SubjectRef } from "../../../src/modules/moderation-engine/rules/engine.js";
import { createTableTransliterator } from "../../../src/modules/moderation-engine/rules/transliterate.js";

const subject: SubjectRef = { channelId: "channel-1", senderRef: "sender-1" };
const transliterator = createTableTransliterator(
  new Map([
    ["沙", "sha"],
    ["比", "bi"],
  ]),
);

describe("in-process safe alias port", () => {
  it("returns the alias confirmed for the subject and null for anyone else", async () => {
    const port = createInProcessSafeAliases([{ ...subject, alias: "小沙" }]);
    expect(await port.lookup(subject)).toBe("小沙");
    expect(await port.lookup({ channelId: "channel-2", senderRef: "sender-1" })).toBeNull();
  });

  it("refuses an alias that is empty, too long or contains a control character, without echoing it", () => {
    const refused = [" ", "a".repeat(41), "bad\nalias"];
    for (const alias of refused) {
      expect(() => createInProcessSafeAliases([{ ...subject, alias }])).toThrow(TypeError);
    }
    try {
      createInProcessSafeAliases([{ ...subject, alias: "bad\nalias" }]);
    } catch (error) {
      expect((error as Error).message).not.toContain("bad");
    }
  });
});

describe("nickname reading", () => {
  it("prefers a host-confirmed alias over the local transliteration", async () => {
    const reading = await resolveNicknameReading(subject, "沙比", {
      safeAliases: createInProcessSafeAliases([{ ...subject, alias: "小沙" }]),
      transliterator,
    });
    expect(reading).toEqual({ source: "safe-alias", text: "小沙" });
  });

  it("reads a complete local transliteration when no alias was confirmed", async () => {
    const reading = await resolveNicknameReading(subject, "沙比", {
      safeAliases: createInProcessSafeAliases(),
      transliterator,
    });
    expect(reading).toEqual({ source: "transliteration", text: "shabi" });
  });

  it("asks for manual confirmation instead of guessing when the transliteration is incomplete", async () => {
    const reading = await resolveNicknameReading(subject, "沙猫", {
      safeAliases: createInProcessSafeAliases(),
      transliterator,
    });
    expect(reading).toEqual({ source: "unavailable", reason: "NEEDS_MANUAL_CONFIRMATION" });
  });

  it("asks for manual confirmation when a nickname has no letters to read", async () => {
    const reading = await resolveNicknameReading(subject, "!!!", {
      safeAliases: createInProcessSafeAliases(),
      transliterator,
    });
    expect(reading).toEqual({ source: "unavailable", reason: "NEEDS_MANUAL_CONFIRMATION" });
  });

  it("reports the nickname as unavailable when none is supplied and no alias exists", async () => {
    const reading = await resolveNicknameReading(subject, null, {
      safeAliases: createInProcessSafeAliases(),
      transliterator,
    });
    expect(reading).toEqual({ source: "unavailable", reason: "NICKNAME_UNAVAILABLE" });
  });
});

describe("nickname reader through the module entry", () => {
  const event: ChannelEvent = {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: "message-1",
    platformOrder: 1,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: "correlation-1",
    body: "hello",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "sender-1" },
  };

  it("reads the nickname from the nickname source and the alias from the alias port", async () => {
    const reader = createNicknameReader({
      nicknames: { displayNicknameOf: () => Promise.resolve("沙比") },
      transliterator,
    });
    expect(await reader.read(event)).toEqual({ source: "transliteration", text: "shabi" });
  });

  it("uses a confirmed alias even when the nickname source has no nickname", async () => {
    const reader = createNicknameReader({
      nicknames: { displayNicknameOf: () => Promise.resolve(null) },
      safeAliases: createInProcessSafeAliases([{ ...subject, alias: "小沙" }]),
    });
    expect(await reader.read(event)).toEqual({ source: "safe-alias", text: "小沙" });
  });
});
