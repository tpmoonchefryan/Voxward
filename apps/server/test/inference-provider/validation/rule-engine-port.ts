import { CONTRACT_VERSION, type ChannelEvent } from "@voxward/contracts";
import type { GeneratedTextChecker, GeneratedTextVerdict } from "../../../src/modules/inference-provider/index.js";
import { createModerationChecker } from "../../../src/modules/moderation-engine/index.js";
import type { RuleSetInput } from "../../../src/modules/moderation-engine/rules/groups.js";

/** A rule set with one explicit BLOCK rule on the word "badword". Synthetic data only. */
export const EXPLICIT_RULES: RuleSetInput = {
  version: "v1",
  groups: [{ id: "explicit", action: { kind: "BLOCK" }, rules: [{ id: "exact-badword", kind: "exact", text: "badword" }] }],
};

/**
 * Binds the generated text port to the real S004 rule engine. This is test wiring. The composition root binds the
 * production port when the Kiro adapter is connected (S008). A rule hit rejects the text. Any other reason that stops
 * the engine from finishing, such as a missing rule set or an over-long text, leaves it unverified. The missing
 * nickname is not part of generated text, so it does not count as incomplete.
 */
export function ruleEngineTextChecker(ruleSet: RuleSetInput | undefined): GeneratedTextChecker {
  const checker = createModerationChecker({ ruleSet, now: () => 0 });
  return {
    async check(text: string): Promise<GeneratedTextVerdict> {
      const verdict = await checker.check(eventCarrying(text));
      if (verdict.hits.length > 0) return "REJECTED";
      const incomplete = verdict.reasons.some((reason) => reason !== "NICKNAME_UNAVAILABLE");
      return incomplete ? "UNVERIFIED" : "CLEAN";
    },
  };
}

function eventCarrying(body: string): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "generated-text",
    platformMessageId: "generated-text",
    platformOrder: 0,
    receivedAt: "2026-01-01T00:00:00.000Z",
    correlationId: "generated-text",
    body,
    sender: { contractVersion: CONTRACT_VERSION, senderRef: "generated-text" },
  };
}
