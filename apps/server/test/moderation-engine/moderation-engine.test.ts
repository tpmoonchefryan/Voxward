import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import { describe, expect, it } from "vitest";
import type { ServerConfig } from "../../src/config/schema.js";
import { createModerationEngine, type ModerationOptions } from "../../src/modules/moderation-engine/index.js";
import { ModerationConfigError, type RuleSetInput } from "../../src/modules/moderation-engine/rules/groups.js";
import { buildRegistry } from "../../src/modules/registry.js";

const config: ServerConfig = { host: "127.0.0.1", port: 3000, adapters: "synthetic" };

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
  return createModerationEngine({
    ...options,
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
