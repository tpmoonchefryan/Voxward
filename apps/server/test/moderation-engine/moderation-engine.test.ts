import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import type { ServerConfig } from "../../src/config/schema.js";
import { createModerationChecker, createModerationEngine, type ModerationOptions } from "../../src/modules/moderation-engine/index.js";
import { ModerationConfigError, type RuleSetInput } from "../../src/modules/moderation-engine/rules/groups.js";
import { createTableTransliterator } from "../../src/modules/moderation-engine/rules/transliterate.js";
import { buildRegistry } from "../../src/modules/registry.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic", databaseFile: "data/voxward.sqlite3" };

const ruleSet: RuleSetInput = {
  version: "v1",
  groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "exact-badword", kind: "exact", text: "badword" }] }],
};

function eventWithBody(body: string): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "channel-1",
    platformMessageId: "message-1",
    platformOrder: 1,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: "correlation-1",
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "sender-1" },
  };
}

function engineWith(options: ModerationOptions) {
  // The rule budget reads the clock. These cases check the contract output, not timing, so the clock is pinned.
  return createModerationEngine({
    ...options,
    now: () => 0,
    nicknames: { displayNicknameOf: () => Promise.resolve("Viewer") },
  });
}

describe("ModerationEngine module entry", () => {
  it("returns the contract result with the event's correlation id and the contract version", async () => {
    const engine = engineWith({ ruleSet });
    const result = await engine.moderate(eventWithBody("hello"));
    expect(result).toEqual({ contractVersion: CONTRACT_VERSION, correlationId: "correlation-1", route: "PASS" });
  });

  it("returns BLOCK through the contract for an explicit violation", async () => {
    const engine = engineWith({ ruleSet });
    const result = await engine.moderate(eventWithBody("a badword here"));
    expect(result.route).toBe("BLOCK");
  });

  it("routes every event to REVIEW when no rule set is configured", async () => {
    const engine = engineWith({});
    const result = await engine.moderate(eventWithBody("hello"));
    expect(result.route).toBe("REVIEW");
  });

  it("routes to REVIEW when no nickname source is bound, because the nickname was not checked", async () => {
    const engine = createModerationEngine({ ruleSet });
    const result = await engine.moderate(eventWithBody("hello"));
    expect(result.route).toBe("REVIEW");
  });

  it("refuses an invalid rule set at creation, naming codes and ids but not the pattern", () => {
    const invalid: RuleSetInput = {
      version: "v1",
      groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "nested", kind: "regex", source: "(a+)+" }] }],
    };
    let thrown: unknown;
    try {
      createModerationEngine({ ruleSet: invalid });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ModerationConfigError);
    expect((thrown as Error).message).toBe("RULE_SET_INVALID: REGEX_QUANTIFIED_GROUP at nested");
    expect((thrown as Error).message).not.toContain("(a+)+");
  });

  it("is what the registry binds for the ModerationEngine slot, no longer a placeholder", async () => {
    const registry = buildRegistry(config);
    const result = await registry.moderationEngine.moderate(eventWithBody("hello"));
    expect(result).toMatchObject({ route: "REVIEW", correlationId: "correlation-1" });
  });
});

describe("transliterator and rule set options (S006 B1)", () => {
  it("refuses a transliterator built with other normalization options than the rule set", () => {
    expect(() =>
      createModerationChecker({
        ruleSet,
        transliterator: createTableTransliterator(new Map(), { stripCombiningMarks: false }),
      }),
    ).toThrow(ModerationConfigError);
  });
});
