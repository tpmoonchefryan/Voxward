import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  CONTRACT_VERSION,
  INTERNAL_CLASSIFICATIONS,
  MODERATION_REASON_CODES,
  POLICY_REASON_CODES,
  type AiBatchInput,
  type InferenceProvider,
  type InferenceRequest,
  type InternalClassification,
  type ModerationRoute,
} from "../../packages/contracts/src/index.js";
import {
  createAnthropicCompatInferenceProvider,
} from "../../apps/server/src/adapters/anthropic-compat/provider.js";
import { KiroInferenceError } from "../../apps/server/src/adapters/kiro-cli/errors.js";
import { sweepOrphanRunDirectories } from "../../apps/server/src/adapters/kiro-cli/orphan-sweep.js";
import { createKiroCliInferenceProvider } from "../../apps/server/src/adapters/kiro-cli/provider.js";
import {
  createOpenAiCompatInferenceProvider,
  parseModelJsonObject,
  type HttpInferenceUsage,
} from "../../apps/server/src/adapters/openai-compat/provider.js";
import {
  runScBatch,
  validateModerationBatch,
  validateReviewBatch,
  type ScModelPort,
  type ScPipelineDeps,
} from "../../apps/server/src/modules/inference-provider/index.js";
import { createTaskCoordinator } from "../../apps/server/src/modules/task-coordinator/index.js";
import { loadBwsSecretsMap } from "../../apps/server/src/security/bws-secrets.js";
import { safeOutboundFetch } from "../../apps/server/src/security/outbound-url.js";
import { channelEventOf, generatedTextChecker } from "../lib/doubles.js";
import { environmentRecord, parseArgs, requireRealModelAuthorization } from "../lib/gate.js";
import { aiMetrics, chunk, correlationOf, countBy, percentile, round3, ruleMetrics } from "../lib/metrics.js";
import { createScratchDir, RULES_PATH, SAMPLES_PATH } from "../lib/paths.js";
import { fullChecker, loadRules } from "../lib/rules.js";
import { groupCounts, loadSampleSet, type Sample } from "../lib/samples.js";

const BWS_PROJECT_ID = "ade022ec-8b07-4b0a-a128-b4ff00761d56";
const OPENAI_MODEL = process.env.VOXWARD_BENCH_OPENAI_MODEL ?? "gpt-4.1-mini";
const ANTHROPIC_BASE_URL = process.env.VOXWARD_BENCH_ANTHROPIC_BASE_URL ?? "https://api.site";
const ANTHROPIC_MODEL = process.env.VOXWARD_BENCH_ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const DEFAULT_KIRO_CLI = join(homedir(), ".local", "bin", "kiro-cli");
const KIRO_CLI_BIN = process.env.VOXWARD_KIRO_CLI_BIN ?? (existsSync(DEFAULT_KIRO_CLI) ? DEFAULT_KIRO_CLI : "kiro-cli");
const MAX_ITEMS = 10;

interface RealtimeProviderReport {
  readonly provider: string;
  readonly modelId: string;
  readonly batches: number;
  readonly completedBatches: number;
  readonly failedBatches: number;
  readonly enumOrContractErrors: number;
  readonly failureCodes: Record<string, number>;
  readonly latencyMs: { readonly p50: number; readonly p95: number; readonly max: number };
  readonly maxQueueAgeMs: number;
  readonly usage: {
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly estimatedUsdPer1kMessages: number | null;
  };
  readonly metrics: ReturnType<typeof aiMetrics>;
}

function estimateUsd(inputTokens: number, outputTokens: number, inPerMillion: number, outPerMillion: number): number {
  return (inputTokens / 1_000_000) * inPerMillion + (outputTokens / 1_000_000) * outPerMillion;
}

function classifyProviderErrorCode(err: unknown): string {
  if (err instanceof KiroInferenceError) return err.code;
  const msg = err instanceof Error ? err.message : String(err);
  if (/^[A-Z0-9_]+(?::[A-Z0-9_]+)?$/.test(msg)) return msg;
  const prefix = /^([A-Z0-9_:-]+)/.exec(msg)?.[1];
  return prefix ?? "UNEXPECTED_ERROR";
}

async function runModerationBenchForProvider(
  label: string,
  modelId: string,
  provider: InferenceProvider,
  samples: readonly Sample[],
  usageRecords: HttpInferenceUsage[],
  pricingPerMillion: { readonly input: number; readonly output: number } | null,
): Promise<RealtimeProviderReport> {
  const batches = chunk(samples, MAX_ITEMS);
  const idByCorrelation = new Map(samples.map((s) => [correlationOf(s), s.id] as const));
  const predicted = new Map<string, InternalClassification>();
  const batchLatencies: number[] = [];
  const failureCodes: string[] = [];
  let enumOrContractErrors = 0;
  let completedBatches = 0;

  // Measure real TaskCoordinator queue-to-commit age across batches.
  const facts = {
    readFacts: () => ({ eventVersion: 1, processingGeneration: 1, deleted: false }),
    commitIfCurrent: (_key: unknown, _expected: unknown, apply: () => void) => {
      apply();
      return { status: "committed" } as const;
    },
  };
  const coordinator = createTaskCoordinator({
    facts,
    concurrency: { current: () => 2 },
    limits: { maxBatchItems: MAX_ITEMS, maxBatchWaitMs: 0 },
  });

  let maxQueueAgeMs = 0;
  const enqueueTimes = new Map<string, number>();

  for (const [index, batch] of batches.entries()) {
    const taskRefs = [];
    for (const [offset, sample] of batch.entries()) {
      const enqueuedAt = performance.now();
      const event = channelEventOf({
        id: `${label}-${index}-${offset}`,
        order: index * MAX_ITEMS + offset,
        senderRef: sample.senderRef,
        body: sample.body,
      });
      enqueueTimes.set(event.platformMessageId, enqueuedAt);
      const ref = await coordinator.enqueueInLane("REALTIME", event, new Date(Date.now() + 30_000).toISOString());
      taskRefs.push({ ref, sample, enqueuedAt });
    }

    const taken = await coordinator.takeBatch({ lanes: ["REALTIME"] });
    const reqItems = batch.map((sample) => ({ correlationId: correlationOf(sample), text: sample.body }));
    const request: InferenceRequest = {
      contractVersion: CONTRACT_VERSION,
      batchId: `real-${label}-${index}`,
      items: reqItems,
      ...(modelId !== "default" ? { selection: { modelId, reasoning: null } } : {}),
    };

    const started = performance.now();
    try {
      const result = await provider.infer(request);
      const elapsed = performance.now() - started;
      batchLatencies.push(elapsed);
      completedBatches += 1;
      for (const item of result.items) {
        const sampleId = idByCorrelation.get(item.correlationId);
        if (sampleId !== undefined) predicted.set(sampleId, item.classification);
      }
      if (taken !== null) {
        for (const task of taken.tasks) {
          await coordinator.commitResult(task.taskId, { apply: () => undefined, evidence: [] });
        }
        await coordinator.finishBatch(taken.batchId);
      }
      for (const entry of taskRefs) {
        maxQueueAgeMs = Math.max(maxQueueAgeMs, performance.now() - entry.enqueuedAt);
      }
    } catch (err) {
      batchLatencies.push(performance.now() - started);
      const code = classifyProviderErrorCode(err);
      failureCodes.push(code);
      if (code.includes("OUTPUT_INVALID") || code.includes("SCHEMA") || code.includes("VALIDATION") || code.includes("ENUM")) {
        enumOrContractErrors += 1;
      }
      if (taken !== null) {
        for (const task of taken.tasks) {
          await coordinator.reportFailure(task.taskId, "MODEL_CALL_FAILED");
        }
        await coordinator.finishBatch(taken.batchId);
      }
    }
  }

  const sortedLatencies = [...batchLatencies].sort((a, b) => a - b);
  const inputTokens =
    usageRecords.length > 0 && usageRecords.every((u) => u.inputTokens !== null)
      ? usageRecords.reduce((sum, u) => sum + (u.inputTokens ?? 0), 0)
      : null;
  const outputTokens =
    usageRecords.length > 0 && usageRecords.every((u) => u.outputTokens !== null)
      ? usageRecords.reduce((sum, u) => sum + (u.outputTokens ?? 0), 0)
      : null;

  const estimatedUsdPer1kMessages =
    pricingPerMillion !== null && inputTokens !== null && outputTokens !== null && samples.length > 0
      ? round3((estimateUsd(inputTokens, outputTokens, pricingPerMillion.input, pricingPerMillion.output) / samples.length) * 1000)
      : null;

  return {
    provider: label,
    modelId,
    batches: batches.length,
    completedBatches,
    failedBatches: batches.length - completedBatches,
    enumOrContractErrors,
    failureCodes: countBy(failureCodes),
    latencyMs: {
      p50: round3(percentile(sortedLatencies, 0.5)),
      p95: round3(percentile(sortedLatencies, 0.95)),
      max: round3(sortedLatencies.at(-1) ?? 0),
    },
    maxQueueAgeMs: round3(maxQueueAgeMs),
    usage: {
      inputTokens,
      outputTokens,
      estimatedUsdPer1kMessages,
    },
    metrics: aiMetrics(samples, predicted),
  };
}

function makeContractValidator(maxItems: number) {
  return async (output: unknown, input: AiBatchInput) => {
    const res = await validateModerationBatch(output, input, { maxItems });
    if (res.ok) return { ok: true as const, items: res.items };
    return { ok: false as const, errors: res.errors.map((e) => ({ code: e.code })) };
  };
}

async function runLiveScProbe(
  label: string,
  modelId: string,
  provider: InferenceProvider & {
    inferScBatch(input: AiBatchInput, call: { batchId: string; modelId: string; reasoning?: string | null }): Promise<unknown>;
  },
  samples: readonly Sample[],
  rules: ReturnType<typeof loadRules>,
): Promise<Record<string, unknown>> {
  const scSamples = samples.filter((s) => ["zh", "ja", "en", "mixed", "evasion"].includes(s.group)).slice(0, 5);
  let counter = 0;
  const scModel: ScModelPort = {
    describe: () => provider.describe(),
    infer: async (input, call) =>
      provider.inferScBatch(input as AiBatchInput, { batchId: call.batchId, modelId: call.selection.modelId }),
  };
  const deps: ScPipelineDeps = {
    safety: provider,
    scModel,
    generatedText: generatedTextChecker(rules),
    addressFor: (cid) => Promise.resolve({ display: `观众-${cid.slice(-4)}`, reading: null }),
    newItemId: () => {
      counter += 1;
      return `sc-live-${counter}`;
    },
    maxItems: 10,
  };
  const request: InferenceRequest = {
    contractVersion: CONTRACT_VERSION,
    batchId: `sc-live-${label}`,
    items: scSamples.map((s) => ({ correlationId: correlationOf(s), text: s.body })),
  };
  const started = performance.now();
  try {
    const outcome = await runScBatch(request, { translationEnabled: true, selection: { modelId, reasoning: null } }, deps);
    const elapsedMs = round3(performance.now() - started);
    if (!outcome.ok) {
      return {
        provider: label,
        modelId,
        ok: false,
        reason: outcome.reason,
        errorCodes: outcome.reason === "BATCH_REJECTED" ? outcome.errorCodes : outcome.issues.map((i) => i.code),
        elapsedMs,
      };
    }
    return {
      provider: label,
      modelId,
      ok: true,
      elapsedMs,
      totalItems: outcome.items.length,
      shownCues: outcome.items.filter((i) => i.cue !== null).length,
      blocked: outcome.items.filter((i) => i.classification === "BLOCK").length,
      generatedTextRejected: outcome.items.filter((i) => i.withheld === "GENERATED_TEXT_REJECTED").length,
    };
  } catch (err) {
    return {
      provider: label,
      modelId,
      ok: false,
      reason: classifyProviderErrorCode(err),
      elapsedMs: round3(performance.now() - started),
    };
  }
}

async function runLiveReviewProbe(openaiKey: string, samples: readonly Sample[]): Promise<Record<string, unknown>> {
  const targetSamples = samples.slice(0, 5);
  const input: AiBatchInput = {
    items: targetSamples.map((s, idx) => ({ itemId: `rv-live-${idx}`, text: s.body })),
  };
  const prompt = [
    "You are VoxWard's background review classifier.",
    "Return ONLY raw JSON of shape:",
    '{"items":[{"itemId":"...","verdict":"ALLOW_MEANINGFUL|ALLOW_NOISE|BLOCK","reasonCodes":["NONE"],"candidateTerms":[{"term":"...","reading":"","suggestedGroup":"REVIEW","rationale":"..."}]}]}',
    `Allowed verdicts: ${INTERNAL_CLASSIFICATIONS.join(", ")}.`,
    `Allowed reasonCodes: ${MODERATION_REASON_CODES.join(", ")} (BLOCK uses [${POLICY_REASON_CODES.join(", ")}]).`,
    "candidateTerms may be empty []. Every input itemId must appear exactly once.",
    "",
    JSON.stringify(input),
  ].join("\n");

  const started = performance.now();
  try {
    const res = await safeOutboundFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const elapsedMs = round3(performance.now() - started);
    if (!res.ok) return { ok: false, statusCode: res.status, elapsedMs };
    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseModelJsonObject(content, "REVIEW_NOT_JSON");
    const validated = await validateReviewBatch(parsed, input, { maxItems: 10 });
    return {
      provider: "openai-compat",
      modelId: OPENAI_MODEL,
      elapsedMs,
      ok: validated.ok,
      contractErrors: validated.ok ? [] : validated.errors.map((e) => e.code),
      itemsValidated: validated.ok ? validated.items.length : 0,
      candidateTermsExtracted: validated.ok ? validated.items.reduce((sum, item) => sum + item.candidateTerms.length, 0) : 0,
    };
  } catch (err) {
    return {
      provider: "openai-compat",
      modelId: OPENAI_MODEL,
      ok: false,
      elapsedMs: round3(performance.now() - started),
      errorCode: classifyProviderErrorCode(err),
    };
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  requireRealModelAuthorization(argv, process.env);
  const args = parseArgs(argv);

  const secrets = loadBwsSecretsMap({ projectId: BWS_PROJECT_ID });
  const openaiKey = secrets.get("openai_api_key_official")?.value;
  const anthropicKey = secrets.get("anthropic_api_key_rightcode")?.value;
  if (!openaiKey || !anthropicKey) {
    throw new Error("Missing required BWS keys (openai_api_key_official / anthropic_api_key_rightcode)");
  }

  const set = loadSampleSet(SAMPLES_PATH);
  const rules = loadRules(RULES_PATH);
  const scratch = createScratchDir("real-model-");
  const kiroRuntimeRoot = join(scratch, "kiro-runs");
  mkdirSync(kiroRuntimeRoot, { recursive: true, mode: 0o700 });

  try {
    const nicknames = new Map(set.samples.map((s) => [s.senderRef, s.nickname] as const));
    const full = fullChecker(rules, {
      displayNicknameOf: (event) => Promise.resolve(nicknames.get(event.sender.senderRef) ?? null),
    });
    const routes = new Map<string, ModerationRoute>();
    for (const [order, sample] of set.samples.entries()) {
      const verdict = await full.check(
        channelEventOf({ id: sample.id, order, senderRef: sample.senderRef, body: sample.body }),
        sample.language === undefined ? undefined : { language: sample.language },
      );
      routes.set(sample.id, verdict.route);
    }

    const validator = makeContractValidator(MAX_ITEMS);
    const openaiUsage: HttpInferenceUsage[] = [];
    const openaiProvider = createOpenAiCompatInferenceProvider({
      apiKey: openaiKey,
      model: OPENAI_MODEL,
      models: [{ modelId: OPENAI_MODEL, reasoningLevels: [] }],
      maxItems: MAX_ITEMS,
      timeoutMs: 45_000,
      validateOutput: validator,
      onUsage: (u) => openaiUsage.push(u),
    });

    const anthropicUsage: HttpInferenceUsage[] = [];
    const anthropicProvider = createAnthropicCompatInferenceProvider({
      baseUrl: ANTHROPIC_BASE_URL,
      apiKey: anthropicKey,
      model: ANTHROPIC_MODEL,
      models: [{ modelId: ANTHROPIC_MODEL, reasoningLevels: [] }],
      maxItems: MAX_ITEMS,
      timeoutMs: 45_000,
      validateOutput: validator,
      onUsage: (u) => anthropicUsage.push(u),
    });

    const kiroEnv: Readonly<Record<string, string>> = {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      LANG: "C.UTF-8",
    };
    const kiroProvider = createKiroCliInferenceProvider({
      command: KIRO_CLI_BIN,
      env: kiroEnv,
      runtimeRoot: kiroRuntimeRoot,
      maxItems: MAX_ITEMS,
      timeoutMs: 60_000,
      validateOutput: validator,
    });

    const realtimeOpenAi = await runModerationBenchForProvider(
      "openai-compat",
      OPENAI_MODEL,
      openaiProvider,
      set.samples,
      openaiUsage,
      { input: 0.4, output: 1.6 },
    );
    const realtimeAnthropic = await runModerationBenchForProvider(
      "anthropic-compat",
      ANTHROPIC_MODEL,
      anthropicProvider,
      set.samples,
      anthropicUsage,
      { input: 1.0, output: 5.0 },
    );
    const realtimeKiro = await runModerationBenchForProvider(
      "kiro-cli",
      "default",
      kiroProvider,
      set.samples,
      [],
      null,
    );

    const kiroSweep = await sweepOrphanRunDirectories({
      runtimeRoot: kiroRuntimeRoot,
      now: new Date(),
      unclaimedAfterMs: 0,
      kiroCli: { command: KIRO_CLI_BIN, env: kiroEnv, timeoutMs: 15_000 },
    });

    const scOpenAi = await runLiveScProbe("openai-compat", OPENAI_MODEL, openaiProvider, set.samples, rules);
    const scAnthropic = await runLiveScProbe("anthropic-compat", ANTHROPIC_MODEL, anthropicProvider, set.samples, rules);
    const reviewOpenAi = await runLiveReviewProbe(openaiKey, set.samples);

    const report = {
      schema: "voxward.bench.real-model.v1",
      bench: "VOXWARD-SUB-050",
      mode: "real-models",
      environment: environmentRecord(),
      samples: {
        total: set.samples.length,
        groups: groupCounts(set),
        provenance: set.provenance,
        containsRealViewerData: false,
      },
      rules: { engine: "moderation-engine", ...ruleMetrics(set.samples, routes) },
      realtime: [realtimeOpenAi, realtimeAnthropic, realtimeKiro],
      scTranslation: [scOpenAi, scAnthropic],
      review: reviewOpenAi,
      kiroCleanupSweep: kiroSweep,
    };

    const output = `${JSON.stringify(report, null, 2)}\n`;
    if (args.out !== undefined) writeFileSync(args.out, output);
    else process.stdout.write(output);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`bench:real failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
