import {
  CONTRACT_VERSION,
  type AiBatchInput,
  type ChannelEvent,
  type InferenceCapabilities,
  type InferenceProvider,
  type InternalClassification,
  type ModerationReasonCode,
  type ModerationRoute,
} from "../../packages/contracts/src/index.js";
import { createSyntheticInferenceProvider } from "../../apps/server/src/adapters/synthetic/inference-provider.js";
import { createKiroCliInferenceProvider } from "../../apps/server/src/adapters/kiro-cli/provider.js";
import {
  type GeneratedTextChecker,
  type ModelSelection,
  type ScModelPort,
  validateModerationBatch,
} from "../../apps/server/src/modules/inference-provider/index.js";
import type { ModerationChecker } from "../../apps/server/src/modules/moderation-engine/index.js";
import { FAKE_CLI } from "./paths.js";
import type { LoadedRules } from "./rules.js";
import { bodyChecker } from "./rules.js";

/** The model id every bench double declares. It is a declaration to pass the selection check, not a capability claim. */
export const BENCH_MODEL_ID = "bench-declared-model";

export const BENCH_SELECTION: ModelSelection = { modelId: BENCH_MODEL_ID, reasoning: null };

export const FIXED_RECEIVED_AT = "2026-11-11T00:00:00.000Z";

/** A channel event with fixed fields, so the outputs do not depend on the clock. */
export function channelEventOf(input: { readonly id: string; readonly order: number; readonly senderRef: string; readonly body: string; readonly language?: string }): ChannelEvent {
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: "bench-channel",
    platformMessageId: `bench-msg-${input.id}`,
    platformOrder: input.order,
    receivedAt: FIXED_RECEIVED_AT,
    correlationId: `bench-corr-${input.id}`,
    body: input.body,
    ...(input.language === undefined ? {} : { language: input.language }),
    sender: { contractVersion: CONTRACT_VERSION, senderRef: input.senderRef },
  };
}

/** Adds the bench model declaration to a provider's capabilities. The adapter itself is not changed. */
export function declareModels(provider: InferenceProvider, providerName: string): InferenceProvider {
  return {
    ...provider,
    describe: (): InferenceCapabilities => ({
      contractVersion: CONTRACT_VERSION,
      providerName,
      supportsCancel: provider.describe().supportsCancel,
      models: [{ modelId: BENCH_MODEL_ID, reasoningLevels: [] }],
    }),
  };
}

/** The synthetic adapter. It returns ALLOW_MEANINGFUL for every item, so it only shows that the pipeline runs. */
export function syntheticProvider(): InferenceProvider {
  return declareModels(createSyntheticInferenceProvider(), "synthetic");
}

export interface FakeCliOptions {
  /** The behaviour of the fake CLI: ok, hang, fail, huge, no-text, not-json or invalid. */
  readonly mode: string;
  readonly logPath: string;
  readonly runtimeRoot: string;
  readonly maxItems: number;
  readonly timeoutMs?: number;
  readonly killGraceMs?: number;
}

/** The real Kiro CLI adapter, pointed at the fake CLI. Its validator is the moderation batch validator. */
export function fakeCliProvider(options: FakeCliOptions): InferenceProvider {
  const provider = createKiroCliInferenceProvider({
    command: FAKE_CLI,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      FAKE_KIRO_LOG: options.logPath,
      FAKE_KIRO_MODE: options.mode,
    },
    runtimeRoot: options.runtimeRoot,
    maxItems: options.maxItems,
    validateOutput: (output, input) => validateModerationBatch(output, input, { maxItems: options.maxItems }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.killGraceMs === undefined ? {} : { killGraceMs: options.killGraceMs }),
  });
  return declareModels(provider, "kiro-cli-fake");
}

/** Body-only route. The AI doubles see only the body, so their verdicts come from this function. */
export function bodyRouteOf(checker: ModerationChecker): (text: string) => Promise<ModerationRoute> {
  return async (text) => {
    const verdict = await checker.check(channelEventOf({ id: "body", order: 0, senderRef: "bench-body", body: text }));
    return verdict.route;
  };
}

/** Generated text is checked by the rule engine on the body path. A route other than PASS rejects the text. */
export function generatedTextChecker(rules: LoadedRules): GeneratedTextChecker {
  const checker = bodyChecker(rules);
  return {
    async check(text) {
      const verdict = await checker.check(channelEventOf({ id: "generated", order: 0, senderRef: "bench-generated", body: text }));
      return verdict.route === "PASS" ? "CLEAN" : "REJECTED";
    },
  };
}

export type InjectedFault = "none" | "extra-item";

/** Output a synthetic model produces for one body: the verdict follows the body-only route, nothing else. */
function classOf(route: ModerationRoute): { readonly verdict: InternalClassification; readonly reason: ModerationReasonCode } {
  return route === "BLOCK" ? { verdict: "BLOCK", reason: "HARASSMENT" } : { verdict: "ALLOW_MEANINGFUL", reason: "NONE" };
}

/**
 * Synthetic SC model. It returns a schema-shaped answer for each item: a verdict from the body route and a placeholder
 * translation. The fault `extra-item` adds an unknown item id, which the batch validator must refuse.
 */
export function syntheticScModel(routeOf: (text: string) => Promise<ModerationRoute>, fault: InjectedFault): ScModelPort {
  return {
    describe: (): InferenceCapabilities => ({
      contractVersion: CONTRACT_VERSION,
      providerName: "bench-sc-synthetic",
      supportsCancel: false,
      models: [{ modelId: BENCH_MODEL_ID, reasoningLevels: [] }],
    }),
    async infer(input: AiBatchInput) {
      const items: Record<string, unknown>[] = [];
      for (const item of input.items) {
        const { verdict, reason } = classOf(await routeOf(item.text));
        const blocked = verdict === "BLOCK";
        items.push({
          itemId: item.itemId,
          verdict,
          reasonCodes: [reason],
          translatedText: blocked ? "" : `译文占位：${item.text}`,
          slangNote: "",
          replyCue: "",
        });
      }
      if (fault === "extra-item") {
        items.push({ itemId: "unknown-item-9999", verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], translatedText: "", slangNote: "", replyCue: "" });
      }
      return { items };
    },
  };
}

/** Synthetic review model. Items with a REVIEW route get one placeholder candidate term for a person to confirm. */
export async function syntheticReviewOutput(
  input: AiBatchInput,
  routeOf: (text: string) => Promise<ModerationRoute>,
): Promise<{ items: Record<string, unknown>[] }> {
  const items: Record<string, unknown>[] = [];
  for (const item of input.items) {
    const route = await routeOf(item.text);
    const { verdict, reason } = classOf(route);
    items.push({
      itemId: item.itemId,
      verdict,
      reasonCodes: [reason],
      candidateTerms: route === "REVIEW" ? [{ term: "候选占位", note: "待人工确认" }] : [],
    });
  }
  return { items };
}
