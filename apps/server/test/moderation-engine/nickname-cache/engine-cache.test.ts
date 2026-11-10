import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import { createModerationChecker, type NicknameSource } from "../../../src/modules/moderation-engine/index.js";
import type { RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";

const ruleSet: RuleSetInput = {
  version: "v1",
  groups: [
    {
      id: "explicit",
      action: { kind: "BLOCK" },
      rules: [
        { id: "exact-badword", kind: "exact", text: "badword" },
        { id: "combo-yz", kind: "normalized", text: "yz" },
      ],
    },
  ],
};

function eventWithBody(body: string, senderRef = "sender-1"): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: `message-${body}`,
    platformOrder: 1,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: `correlation-${body}`,
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef },
  };
}

/** A nickname source whose answer the test can change, to simulate a rename. */
function mutableNicknames(initial: string): { source: NicknameSource; set(nickname: string): void } {
  let current = initial;
  return {
    source: { displayNicknameOf: () => Promise.resolve(current) },
    set: (nickname) => {
      current = nickname;
    },
  };
}

describe("nickname cache inside the moderation checker", () => {
  it("still checks the body when the nickname verdict comes from the cache", async () => {
    const checker = createModerationChecker({ ruleSet, nicknames: mutableNicknames("Viewer").source, now: () => 0 });
    const first = await checker.check(eventWithBody("hello"));
    const second = await checker.check(eventWithBody("badword"));
    expect(first.route).toBe("PASS");
    expect(second.route).toBe("BLOCK");
  });

  it("still runs the combined check when the nickname verdict comes from the cache", async () => {
    const nicknames = mutableNicknames("xy");
    const checker = createModerationChecker({ ruleSet, nicknames: nicknames.source, now: () => 0 });
    const first = await checker.check(eventWithBody("q"));
    const second = await checker.check(eventWithBody("z"));
    expect(first.route).toBe("PASS");
    expect(second.route).toBe("BLOCK");
    expect(second.hits.map((hit) => hit.scope)).toEqual(["combined"]);
  });

  it("applies a cached nickname hit to later messages from the same subject", async () => {
    const checker = createModerationChecker({
      ruleSet,
      nicknames: mutableNicknames("badword").source,
      now: () => 0,
    });
    await checker.check(eventWithBody("hello"));
    const later = await checker.check(eventWithBody("hello again"));
    expect(later.route).toBe("BLOCK");
    expect(later.hits.map((hit) => hit.scope)).toEqual(["nickname"]);
  });

  it("checks a changed nickname again instead of answering from the old verdict", async () => {
    const nicknames = mutableNicknames("Viewer");
    const checker = createModerationChecker({ ruleSet, nicknames: nicknames.source, now: () => 0 });
    expect((await checker.check(eventWithBody("hello"))).route).toBe("PASS");
    nicknames.set("badword");
    expect((await checker.check(eventWithBody("hello"))).route).toBe("BLOCK");
  });

  it("refuses an invalid cache limit when the checker is created", () => {
    expect(() => createModerationChecker({ ruleSet, nicknameCache: { maxEntries: 0 } })).toThrow(TypeError);
  });
});
