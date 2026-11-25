import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTRACT_VERSION,
  type AiBatchInput,
  type InferenceProvider,
  type InferenceRequest,
  type InternalClassification,
  type ModerationRoute,
} from "../../packages/contracts/src/index.js";
import {
  runScBatch,
  validateReviewBatch,
  type ScItemOutcome,
  type ScModelPort,
  type ScPipelineDeps,
  type ScRunChoices,
} from "../../apps/server/src/modules/inference-provider/index.js";
import {
  BENCH_SELECTION,
  bodyRouteOf,
  channelEventOf,
  fakeCliProvider,
  generatedTextChecker,
  syntheticProvider,
  syntheticReviewOutput,
  syntheticScModel,
} from "../lib/doubles.js";
import { parseArgs, refuseRealModelRequest } from "../lib/gate.js";
import { createScratchDir, RULES_PATH, SAMPLES_PATH } from "../lib/paths.js";
import { aiMetrics, bySampleLanguage, chunk, correlationOf, countBy, errorCodeOf, ruleMetrics } from "../lib/metrics.js";
import { bodyChecker, fullChecker, loadRules } from "../lib/rules.js";
import { groupCounts, loadSampleSet, sampleLanguage, SampleSetError, type Sample } from "../lib/samples.js";

/** Largest batch the bench sends, matching the deployment default used by the adapter tests. */
const MAX_ITEMS = 10;
const CORRELATION_PREFIX = "bench-corr-";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  refuseRealModelRequest(argv, process.env);
  const args = parseArgs(argv);

  const set = loadSampleSet(SAMPLES_PATH);
  const rules = loadRules(RULES_PATH);
  const scratch = createScratchDir("quality-");
  const runtimeRoot = join(scratch, "runs");
  mkdirSync(runtimeRoot);
  const logPath = join(scratch, "fake-cli.log");

  const nicknames = new Map(set.samples.map((sample) => [sample.senderRef, sample.nickname] as const));
  const full = fullChecker(rules, {
    displayNicknameOf: (event) => Promise.resolve(nicknames.get(event.sender.senderRef) ?? null),
  });
  const routeOfBody = bodyRouteOf(bodyChecker(rules));

  // Rules: the full message, nickname included, through the real engine.
  const routes = new Map<string, ModerationRoute>();
  for (const [order, sample] of set.samples.entries()) {
    const verdict = await full.check(channelEventOf({ id: sample.id, order, senderRef: sample.senderRef, body: sample.body, language: sampleLanguage(sample) }));
    routes.set(sample.id, verdict.route);
  }

  const idByCorrelation = new Map(set.samples.map((sample) => [correlationOf(sample), sample.id] as const));
  const batches = chunk(set.samples, MAX_ITEMS);

  const realtime = async (label: string, provider: InferenceProvider): Promise<Record<string, unknown>> => {
    const predicted = new Map<string, InternalClassification>();
    const refused: string[] = [];
    for (const [index, batch] of batches.entries()) {
      const request: InferenceRequest = {
        contractVersion: CONTRACT_VERSION,
        batchId: `rt-${label}-${index}`,
        items: batch.map((sample) => ({ correlationId: correlationOf(sample), text: sample.body })),
      };
      try {
        const result = await provider.infer(request);
        for (const item of result.items) {
          const id = idByCorrelation.get(item.correlationId);
          if (id !== undefined) predicted.set(id, item.classification);
        }
      } catch (error) {
        refused.push(errorCodeOf(error));
      }
    }
    return { double: label, qualityMeaningful: false, batches: batches.length, refusedBatches: countBy(refused), ...aiMetrics(set.samples, predicted), byLanguage: bySampleLanguage(set.samples, (samples) => aiMetrics(samples, predicted)) };
  };

  const scRun = async (label: string, translationEnabled: boolean, deps: ScPipelineDeps): Promise<Record<string, unknown>> => {
    const choices: ScRunChoices = { translationEnabled, selection: BENCH_SELECTION };
    const outcomes = new Map<string, ScItemOutcome>();
    const refused: string[] = [];
    for (const [index, batch] of batches.entries()) {
      const request: InferenceRequest = {
        contractVersion: CONTRACT_VERSION,
        batchId: `sc-${label}-${index}`,
        items: batch.map((sample) => ({ correlationId: correlationOf(sample), text: sample.body })),
      };
      const outcome = await runScBatch(request, choices, deps);
      if (outcome.ok) {
        for (const item of outcome.items) outcomes.set(item.correlationId, item);
      } else {
        refused.push(outcome.reason === "BATCH_REJECTED" ? outcome.errorCodes.join("+") : outcome.reason);
      }
    }
    const withheld: Record<string, number> = {};
    const predicted = new Map<string, InternalClassification>();
    let shownCues = 0;
    let generatedTextRejected = 0;
    for (const [correlation, item] of outcomes) {
      const id = idByCorrelation.get(correlation);
      if (id !== undefined) predicted.set(id, item.classification);
      if (item.cue !== null) {
        shownCues += 1;
      } else {
        const reason = item.withheld ?? "NONE";
        withheld[reason] = (withheld[reason] ?? 0) + 1;
        if (reason === "GENERATED_TEXT_REJECTED") generatedTextRejected += 1;
      }
    }
    return {
      double: label,
      qualityMeaningful: false,
      translationEnabled,
      batches: batches.length,
      refusedBatches: countBy(refused),
      shownCues,
      generatedTextRejected,
      withheld,
      ...aiMetrics(set.samples, predicted),
      byLanguage: bySampleLanguage(set.samples, (samples) => aiMetrics(samples, predicted)),
    };
  };

  const scDeps = (scModel: ScModelPort, safety: InferenceProvider): ScPipelineDeps => {
    let counter = 0;
    return {
      safety,
      scModel,
      generatedText: generatedTextChecker(rules),
      addressFor: (correlationId) => Promise.resolve({ display: `观众${correlationId.slice(CORRELATION_PREFIX.length)}`, reading: null }),
      newItemId: () => {
        counter += 1;
        return `item-${counter}`;
      },
      maxItems: MAX_ITEMS,
    };
  };

  const review = async (): Promise<Record<string, unknown>> => {
    const predicted = new Map<string, InternalClassification>();
    const contractRefusals: string[] = [];
    let candidateTerms = 0;
    for (const [index, batch] of batches.entries()) {
      const input: AiBatchInput = {
        items: batch.map((sample, position) => ({ itemId: `rv-${index}-${position}`, text: sample.body })),
      };
      const raw = await syntheticReviewOutput(input, routeOfBody);
      const validation = await validateReviewBatch(raw, input, { maxItems: MAX_ITEMS });
      if (!validation.ok) {
        contractRefusals.push(validation.errors.map((error) => error.code).join("+"));
        continue;
      }
      const byItem = new Map(validation.items.map((item) => [item.itemId, item] as const));
      for (const [position, sample] of batch.entries()) {
        const item = byItem.get(`rv-${index}-${position}`);
        if (item === undefined) continue;
        predicted.set(sample.id, item.verdict);
        candidateTerms += item.candidateTerms.length;
      }
    }
    return {
      double: "synthetic-review-model",
      qualityMeaningful: false,
      batches: batches.length,
      contractRefusals: countBy(contractRefusals),
      candidateTerms,
      ...aiMetrics(set.samples, predicted),
      byLanguage: bySampleLanguage(set.samples, (samples) => aiMetrics(samples, predicted)),
    };
  };

  const fakeSafety = fakeCliProvider({ mode: "ok", logPath, runtimeRoot, maxItems: MAX_ITEMS });
  const noFaultModel = syntheticScModel(routeOfBody, "none");
  const extraItemModel = syntheticScModel(routeOfBody, "extra-item");
  const synthetic = syntheticProvider();

  const report = {
    schema: "voxward.bench.quality.v1",
    bench: "VOXWARD-SUB-049",
    mode: "doubles-only",
    note: "Doubles show that the pipeline runs and is reproducible. They are not a measurement of any model's quality.",
    samples: { total: set.samples.length, groups: groupCounts(set), provenance: set.provenance, containsRealViewerData: false },
    ruleSet: { version: rules.version, groups: rules.groupCount, rules: rules.ruleCount, readings: rules.readingCount },
    rules: { engine: "moderation-engine", qualityMeaningful: false, ...ruleMetrics(set.samples, routes), byLanguage: bySampleLanguage(set.samples, (samples) => ruleMetrics(samples, routes)) },
    realtime: {
      synthetic: await realtime("synthetic", synthetic),
      fakeCli: await realtime("fake-cli", fakeSafety),
    },
    sc: {
      translationOff: await scRun("off", false, scDeps(noFaultModel, fakeSafety)),
      translationOnNoFault: await scRun("on-none", true, scDeps(noFaultModel, fakeSafety)),
      translationOnExtraItemFault: await scRun("on-extra", true, scDeps(extraItemModel, fakeSafety)),
    },
    review: await review(),
    crossLine: crossLineSummary(set.samples),
    notMeasured: [
      "human overturn rate: the doubles have no human reviewer",
      "API quota and per-stream model cost: no real model runs in this package (SUB-050)",
      "joint verdict of cross-line threads: the engine judges each message alone, so thread expectations are only counted",
      "review settlement loop (review store and task coordinator): not wired; only the review model contract and verdict agreement are measured",
    ],
  };

  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out !== undefined) writeFileSync(args.out, text);
  else process.stdout.write(text);

  rmSync(scratch, { recursive: true, force: true });
}

function crossLineSummary(samples: readonly Sample[]): Record<string, unknown> {
  const threads = new Map<string, Sample[]>();
  for (const sample of samples) {
    if (sample.thread === null) continue;
    const list = threads.get(sample.thread) ?? [];
    list.push(sample);
    threads.set(sample.thread, list);
  }
  let jointBlock = 0;
  let jointPass = 0;
  for (const lines of threads.values()) {
    if (lines[0]?.joint === "BLOCK") jointBlock += 1;
    if (lines[0]?.joint === "PASS") jointPass += 1;
  }
  return {
    threads: threads.size,
    lines: [...threads.values()].reduce((total, lines) => total + lines.length, 0),
    jointBlockThreads: jointBlock,
    jointPassThreads: jointPass,
    scored: false,
    reason: "the engine judges each message alone; joint thread expectations are counted, not scored",
  };
}

main().catch((error: unknown) => {
  if (error instanceof SampleSetError) {
    for (const issue of error.issues) process.stderr.write(`sample: ${issue}\n`);
  } else {
    process.stderr.write(`quality: failed with ${errorCodeOf(error)}: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  process.exit(1);
});
