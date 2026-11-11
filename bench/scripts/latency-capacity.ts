import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRACT_VERSION, type InferenceProvider, type InferenceRequest } from "../../packages/contracts/src/index.js";
import { channelEventOf, fakeCliProvider } from "../lib/doubles.js";
import { environmentRecord, parseArgs, refuseRealModelRequest } from "../lib/gate.js";
import { createScratchDir, RULES_PATH, SAMPLES_PATH } from "../lib/paths.js";
import { chunk, correlationOf, countBy, errorCodeOf, percentile, round3 } from "../lib/metrics.js";
import { fullChecker, loadRules } from "../lib/rules.js";
import { loadSampleSet, SampleSetError } from "../lib/samples.js";

const STATIC_ROUNDS = 20;
const BATCH_SIZE = 10;
const CONCURRENCY_LEVELS = [1, 2, 4] as const;
const PASSES_PER_LEVEL = 3;
const TIMEOUT_PROBE_MS = 500;

interface PoolRun {
  readonly wallMs: number;
  readonly durations: readonly number[];
  readonly refused: readonly string[];
}

/** Sends the requests with at most `level` in flight. Each request is timed from send to answer. */
async function runPool(level: number, requests: readonly InferenceRequest[], provider: InferenceProvider): Promise<PoolRun> {
  const durations: number[] = [];
  const refused: string[] = [];
  let next = 0;
  const started = performance.now();
  const worker = async (): Promise<void> => {
    for (;;) {
      const request = requests[next];
      next += 1;
      if (request === undefined) return;
      const sentAt = performance.now();
      try {
        await provider.infer(request);
      } catch (error) {
        refused.push(errorCodeOf(error));
      }
      durations.push(performance.now() - sentAt);
    }
  };
  await Promise.all(Array.from({ length: level }, () => worker()));
  return { wallMs: performance.now() - started, durations, refused };
}

async function probe(provider: InferenceProvider, request: InferenceRequest): Promise<Record<string, unknown>> {
  const sentAt = performance.now();
  try {
    await provider.infer(request);
    return { outcome: "COMPLETED", errorCode: null, elapsedMs: round3(performance.now() - sentAt) };
  } catch (error) {
    return { outcome: "REFUSED", errorCode: errorCodeOf(error), elapsedMs: round3(performance.now() - sentAt) };
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  refuseRealModelRequest(argv, process.env);
  const args = parseArgs(argv);

  const set = loadSampleSet(SAMPLES_PATH);
  const rules = loadRules(RULES_PATH);
  const scratch = createScratchDir("latency-");
  const runtimeRoot = join(scratch, "runs");
  mkdirSync(runtimeRoot);
  const logPath = join(scratch, "fake-cli.log");

  // Static processing time: the rule engine on each sample, with the nickname verdict cache warm after the first round.
  const nicknames = new Map(set.samples.map((sample) => [sample.senderRef, sample.nickname] as const));
  const checker = fullChecker(rules, {
    displayNicknameOf: (event) => Promise.resolve(nicknames.get(event.sender.senderRef) ?? null),
  });
  const staticMs: number[] = [];
  const firstRoundMs: number[] = [];
  for (let round = 0; round < STATIC_ROUNDS; round++) {
    for (const [order, sample] of set.samples.entries()) {
      const event = channelEventOf({ id: sample.id, order, senderRef: sample.senderRef, body: sample.body });
      const sentAt = performance.now();
      await checker.check(event);
      const elapsed = performance.now() - sentAt;
      staticMs.push(elapsed);
      if (round === 0) firstRoundMs.push(elapsed);
    }
  }
  const staticSorted = [...staticMs].sort((a, b) => a - b);
  const firstSorted = [...firstRoundMs].sort((a, b) => a - b);

  // End to end: the real Kiro CLI adapter against the fake CLI (mode ok), at several concurrency levels.
  const provider = fakeCliProvider({ mode: "ok", logPath, runtimeRoot, maxItems: BATCH_SIZE });
  const batches = chunk(set.samples, BATCH_SIZE);
  const endToEnd: Record<string, unknown>[] = [];
  for (const level of CONCURRENCY_LEVELS) {
    const requests: InferenceRequest[] = [];
    for (let pass = 0; pass < PASSES_PER_LEVEL; pass++) {
      for (const [index, batch] of batches.entries()) {
        requests.push({
          contractVersion: CONTRACT_VERSION,
          batchId: `e2e-${level}-${pass}-${index}`,
          items: batch.map((sample) => ({ correlationId: correlationOf(sample), text: sample.body })),
        });
      }
    }
    const run = await runPool(level, requests, provider);
    const sorted = [...run.durations].sort((a, b) => a - b);
    endToEnd.push({
      concurrency: level,
      batches: requests.length,
      p50Ms: round3(percentile(sorted, 0.5)),
      p95Ms: round3(percentile(sorted, 0.95)),
      wallMs: round3(run.wallMs),
      throughputBatchesPerSec: round3(requests.length / (run.wallMs / 1000)),
      refusedBatches: countBy(run.refused),
    });
  }

  // Probes: a batch that never ends, and a batch whose output is over the adapter limit.
  const firstBatch = batches[0] ?? [];
  const probeItems = firstBatch.map((sample) => ({ correlationId: correlationOf(sample), text: sample.body }));
  const timeoutProvider = fakeCliProvider({
    mode: "hang",
    logPath: join(scratch, "probe-timeout.log"),
    runtimeRoot,
    maxItems: BATCH_SIZE,
    timeoutMs: TIMEOUT_PROBE_MS,
    killGraceMs: 200,
  });
  const hugeProvider = fakeCliProvider({
    mode: "huge",
    logPath: join(scratch, "probe-huge.log"),
    runtimeRoot,
    maxItems: BATCH_SIZE,
  });
  const timeoutResult = await probe(timeoutProvider, { contractVersion: CONTRACT_VERSION, batchId: "probe-timeout", items: probeItems });
  const hugeResult = await probe(hugeProvider, { contractVersion: CONTRACT_VERSION, batchId: "probe-huge", items: probeItems });

  const report = {
    schema: "voxward.bench.latency-capacity.v1",
    bench: "VOXWARD-SUB-049",
    mode: "doubles-only",
    note: "Times measure this machine running the rule engine and the Kiro CLI adapter against the fake CLI. They do not measure a model.",
    environment: environmentRecord(),
    parameters: {
      samples: set.samples.length,
      staticRounds: STATIC_ROUNDS,
      batchSize: BATCH_SIZE,
      concurrencyLevels: CONCURRENCY_LEVELS,
      passesPerLevel: PASSES_PER_LEVEL,
      realtimeDouble: "kiro-cli adapter + fake CLI (mode ok); no model runs",
    },
    staticRules: {
      observations: staticMs.length,
      p50Ms: round3(percentile(staticSorted, 0.5)),
      p95Ms: round3(percentile(staticSorted, 0.95)),
      firstRoundP50Ms: round3(percentile(firstSorted, 0.5)),
      firstRoundP95Ms: round3(percentile(firstSorted, 0.95)),
      cacheNote: "rounds after the first reuse the nickname verdict cache",
    },
    endToEnd,
    probes: {
      timeout: { timeoutMs: TIMEOUT_PROBE_MS, ...timeoutResult },
      hugeOutput: hugeResult,
    },
    notMeasured: [
      "queue age of the oldest message: needs the task coordinator and the review loop wired (S011, S014); not measured here",
      "real model latency and per-stream cost: SUB-050 with the Owner account",
      "model structure failure rate on a real model: doubles return valid output by design; the fault rows are in quality.json",
    ],
  };

  const text = `${JSON.stringify(report, null, 2)}\n`;
  if (args.out !== undefined) writeFileSync(args.out, text);
  else process.stdout.write(text);
  rmSync(scratch, { recursive: true, force: true });
}

main().catch((error: unknown) => {
  if (error instanceof SampleSetError) {
    for (const issue of error.issues) process.stderr.write(`sample: ${issue}\n`);
  } else {
    process.stderr.write(`latency-capacity: failed with ${errorCodeOf(error)}\n`);
  }
  process.exit(1);
});
