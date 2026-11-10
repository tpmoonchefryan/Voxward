import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  CONTRACT_VERSION,
  type AiBatchInput,
  type InferenceProvider,
  type InferenceRequest,
  type InferenceResult,
  type InferenceResultItem,
  type InternalClassification,
} from "@voxward/contracts";
import { describeKiroCli } from "./capabilities.js";
import { buildChatArguments, type RunSettings } from "./command.js";
import { KiroInferenceError } from "./errors.js";
import { buildModelInput, type ModelInput } from "./input-builder.js";
import { parseBusinessJson, readRunStream } from "./run-stream.js";

/** The validator's outcome as this adapter needs it. The composition root binds the moderation module's validator. */
export type BatchOutputOutcome =
  | {
      readonly ok: true;
      readonly items: readonly { readonly itemId: string; readonly verdict: InternalClassification }[];
    }
  | { readonly ok: false; readonly errors: readonly { readonly code: string }[] };

/**
 * Validates the parsed business output against the batch input. This adapter cannot import the moderation module (design
 * D2), so the validator arrives as a port. A result is produced only from an ok outcome.
 */
export type BatchOutputValidator = (output: unknown, input: AiBatchInput) => Promise<BatchOutputOutcome>;

export interface KiroCliProviderOptions extends RunSettings {
  /** Path of the kiro-cli executable. Tests point this at a fake CLI. */
  readonly command: string;
  /** The complete environment of the CLI process. The server environment is never inherited. */
  readonly env: Readonly<Record<string, string>>;
  /** Directory the CLI runs in. */
  readonly workingDirectory: string;
  /** Largest batch this deployment accepts. A larger request is refused before any process starts. */
  readonly maxItems: number;
  readonly validateOutput: BatchOutputValidator;
  /** Default 120000 ms (design section 4.6). */
  readonly timeoutMs?: number;
  /** Default 1 MiB (design section 4.6). */
  readonly maxOutputBytes?: number;
  /** Delay between SIGTERM and SIGKILL. Default 2000 ms. */
  readonly killGraceMs?: number;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;
const DEFAULT_KILL_GRACE_MS = 2_000;

type StopReason = "RUN_CANCELLED" | "RUN_TIMEOUT" | "RUN_OUTPUT_TOO_LARGE";

interface ActiveRun {
  readonly child: ChildProcessWithoutNullStreams;
  stopReason: StopReason | undefined;
  forceKillTimer: NodeJS.Timeout | undefined;
}

/** One provider per deployment. Batches run in parallel, and each is addressed by its batch id. */
export function createKiroCliInferenceProvider(options: KiroCliProviderOptions): InferenceProvider {
  const active = new Map<string, ActiveRun>();
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: describeKiroCli,
    infer: (request) => inferBatch(request, options, active),
    cancel: async (batchId) => stopBatch(active, batchId, "RUN_CANCELLED", options),
    releaseSession: async (batchId) => stopBatch(active, batchId, "RUN_CANCELLED", options),
  };
}

async function inferBatch(
  request: InferenceRequest,
  options: KiroCliProviderOptions,
  active: Map<string, ActiveRun>,
): Promise<InferenceResult> {
  checkRequest(request, options.maxItems, active);
  // Everything up to the spawn is synchronous, so a second request with the same batch id sees the claim made by runCli.
  const model = buildModelInput(request.items);
  const stdout = await runCli(request.batchId, model, options, active);
  const items = await decodeResult(request.batchId, request, model, stdout, options.validateOutput);
  return { contractVersion: CONTRACT_VERSION, batchId: request.batchId, items };
}

/** Refuses a request the adapter cannot map back, before anything is sent. Runtime checks, because callers are not typed. */
function checkRequest(request: InferenceRequest, maxItems: number, active: ReadonlyMap<string, ActiveRun>): void {
  const batchId = typeof request.batchId === "string" ? request.batchId : "";
  const invalid = () => new KiroInferenceError("REQUEST_INVALID", batchId);
  if (batchId === "" || active.has(batchId)) throw invalid();
  const items: unknown = request.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > maxItems) throw invalid();
  const correlationIds = new Set<string>();
  for (const item of request.items) {
    if (typeof item.correlationId !== "string" || item.correlationId === "" || typeof item.text !== "string") {
      throw invalid();
    }
    if (correlationIds.has(item.correlationId)) throw invalid();
    correlationIds.add(item.correlationId);
  }
}

/** Runs one headless CLI process with the prompt on stdin. Resolves with its stdout, or rejects with a run error code. */
function runCli(
  batchId: string,
  model: ModelInput,
  options: KiroCliProviderOptions,
  active: Map<string, ActiveRun>,
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  return new Promise<string>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(options.command, buildChatArguments(options), {
        cwd: options.workingDirectory,
        env: { ...options.env },
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
        windowsHide: true,
      });
    } catch {
      reject(new KiroInferenceError("RUN_SPAWN_FAILED", batchId));
      return;
    }

    const run: ActiveRun = { child, stopReason: undefined, forceKillTimer: undefined };
    active.set(batchId, run);
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;

    const finish = (outcome: { readonly stdout: string } | { readonly error: KiroInferenceError }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (run.forceKillTimer !== undefined) clearTimeout(run.forceKillTimer);
      if (active.get(batchId) === run) active.delete(batchId);
      if ("error" in outcome) reject(outcome.error);
      else resolve(outcome.stdout);
    };

    const timer = setTimeout(() => stopRun(run, "RUN_TIMEOUT", killGraceMs), timeoutMs);

    child.stdin.on("error", () => {
      // The CLI may exit before it reads its input. Its exit status decides the outcome, so this error is not separate.
    });
    child.stdin.end(model.prompt, "utf8");

    child.stdout.on("data", (chunk: Buffer) => {
      if (run.stopReason !== undefined) return;
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        stopRun(run, "RUN_OUTPUT_TOO_LARGE", killGraceMs);
        return;
      }
      chunks.push(chunk);
    });
    child.stderr.on("data", () => {
      // stderr is read so the pipe never fills, and then dropped. It can carry anything, so it is never kept or echoed.
    });

    child.on("error", () => {
      // An error after the process started (for example a failed kill) is not a spawn failure. Its exit still arrives.
      if (child.pid === undefined) finish({ error: new KiroInferenceError("RUN_SPAWN_FAILED", batchId) });
    });

    child.on("close", (code) => {
      if (run.stopReason !== undefined) {
        finish({ error: new KiroInferenceError(run.stopReason, batchId) });
        return;
      }
      if (code !== 0) {
        finish({ error: new KiroInferenceError("RUN_FAILED", batchId, { exitCode: code ?? undefined }) });
        return;
      }
      finish({ stdout: Buffer.concat(chunks).toString("utf8") });
    });
  });
}

/** Turns stdout into one classification per request item. Only a validator-approved output produces a result. */
async function decodeResult(
  batchId: string,
  request: InferenceRequest,
  model: ModelInput,
  stdout: string,
  validateOutput: BatchOutputValidator,
): Promise<InferenceResultItem[]> {
  const summary = readRunStream(stdout);
  if (summary.businessText === undefined) throw new KiroInferenceError("RUN_OUTPUT_MISSING", batchId);

  const parsed = parseBusinessJson(summary.businessText);
  if (!parsed.ok) throw new KiroInferenceError("RUN_OUTPUT_NOT_JSON", batchId);

  const outcome = await validateOutput(parsed.value, model.batch);
  if (!outcome.ok) {
    throw new KiroInferenceError("RUN_OUTPUT_INVALID", batchId, {
      validationCodes: outcome.errors.map((error) => error.code),
    });
  }

  const verdictByItemId = new Map(outcome.items.map((item) => [item.itemId, item.verdict] as const));
  const itemIdByCorrelationId = new Map<string, string>();
  for (const [itemId, correlationId] of model.itemIds) itemIdByCorrelationId.set(correlationId, itemId);

  return request.items.map((item) => {
    const itemId = itemIdByCorrelationId.get(item.correlationId);
    const classification = itemId === undefined ? undefined : verdictByItemId.get(itemId);
    if (classification === undefined) {
      throw new KiroInferenceError("RUN_OUTPUT_INVALID", batchId, { validationCodes: ["ITEM_RESULT_MISSING"] });
    }
    return { correlationId: item.correlationId, classification };
  });
}

/** Stops the batch's process group. The first reason wins, so a timeout is not reported as a cancellation. */
function stopRun(run: ActiveRun, reason: StopReason, killGraceMs: number): void {
  if (run.stopReason !== undefined) return;
  run.stopReason = reason;
  signalGroup(run.child, "SIGTERM");
  run.forceKillTimer = setTimeout(() => signalGroup(run.child, "SIGKILL"), killGraceMs);
}

function stopBatch(
  active: ReadonlyMap<string, ActiveRun>,
  batchId: string,
  reason: StopReason,
  options: KiroCliProviderOptions,
): void {
  const run = active.get(batchId);
  if (run === undefined) return;
  stopRun(run, reason, options.killGraceMs ?? DEFAULT_KILL_GRACE_MS);
}

/** Signals the process group, so tools or helpers the CLI started stop with it. A group that has already exited is fine. */
function signalGroup(child: ChildProcessWithoutNullStreams, signal: NodeJS.Signals): void {
  if (child.pid === undefined) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // The group has already exited.
  }
}
