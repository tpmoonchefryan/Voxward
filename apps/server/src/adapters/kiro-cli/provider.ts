import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import {
  CONTRACT_VERSION,
  type AiBatchInput,
  type InferenceProvider,
  type InferenceRequest,
  type InferenceResult,
  type InferenceResultItem,
  type InternalClassification,
  type MatchedSpan,
  type ModerationReasonCode,
} from "@voxward/contracts";
import { describeKiroCli } from "./capabilities.js";
import { markRunDirectoryActive, releaseRunDirectory } from "./active-runs.js";
import { requestKiroSessionDeletion, removeRunDirectory } from "./cleanup.js";
import { buildChatArguments, type RunSettings } from "./command.js";
import { KiroInferenceError } from "./errors.js";
import { buildModelInput, type ModelInput } from "./input-builder.js";
import { signalProcessGroup } from "./process-group.js";
import { parseBusinessJson, readRunStream, createSessionIdScanner } from "./run-stream.js";
import { openRunSession, type RunSession } from "./session-lifecycle.js";

/** One validated item of the batch output, as the validator reports it. `itemId` is the id the model answered under. */
export interface ValidatedOutputItem {
  readonly itemId: string;
  readonly verdict: InternalClassification;
  readonly reasonCodes: readonly ModerationReasonCode[];
  readonly matchedSpan?: MatchedSpan;
}

/** The validator's outcome as this adapter needs it. The composition root binds the moderation module's validator. */
export type BatchOutputOutcome =
  | {
      readonly ok: true;
      readonly items: readonly ValidatedOutputItem[];
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
  /**
   * Parent of the one-time run directories. The deployment creates it with owner-only permissions (deploy/kiro-runtime).
   * Each batch gets its own directory under it, and the CLI runs inside that directory.
   */
  readonly runtimeRoot: string;
  /** Largest batch this deployment accepts. A larger request is refused before any process starts. */
  readonly maxItems: number;
  readonly validateOutput: BatchOutputValidator;
  /** Default 120000 ms (design section 4.6). */
  readonly timeoutMs?: number;
  /** Default 1 MiB (design section 4.6). */
  readonly maxOutputBytes?: number;
  /** Delay between SIGTERM and SIGKILL. Default 2000 ms. */
  readonly killGraceMs?: number;
  /** Clock for session records. Default: the system clock. */
  readonly now?: () => Date;
}

export const MIN_KIRO_TIMEOUT_MS = 1;
export const MAX_KIRO_TIMEOUT_MS = 300_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;
const DEFAULT_KILL_GRACE_MS = 2_000;
/** Limit for the delete command of a saved CLI session, so cleanup cannot hang (自定). */
const DEFAULT_DELETE_TIMEOUT_MS = 30_000;

type StopReason = "RUN_CANCELLED" | "RUN_TIMEOUT" | "RUN_OUTPUT_TOO_LARGE" | "SESSION_UNAVAILABLE";

interface ActiveRun {
  readonly child: ChildProcessWithoutNullStreams;
  stopReason: StopReason | undefined;
  forceKillTimer: NodeJS.Timeout | undefined;
}

/**
 * One batch from acceptance to cleanup. `run` appears once the process exists. `cancelled` records a cancel that arrives
 * before the process exists, so the batch never starts. `kiroSessionId` holds the id observed in the run stream.
 */
interface BatchSlot {
  run: ActiveRun | undefined;
  cancelled: boolean;
  kiroSessionId: string | undefined;
}

/** One provider per deployment. Batches run in parallel, and each is addressed by its batch id. */
export function createKiroCliInferenceProvider(options: KiroCliProviderOptions): InferenceProvider {
  if (
    options.timeoutMs !== undefined &&
    (!Number.isInteger(options.timeoutMs) || options.timeoutMs < MIN_KIRO_TIMEOUT_MS || options.timeoutMs > MAX_KIRO_TIMEOUT_MS)
  ) {
    throw new RangeError(`timeoutMs must be an integer between ${MIN_KIRO_TIMEOUT_MS} and ${MAX_KIRO_TIMEOUT_MS}`);
  }
  const slots = new Map<string, BatchSlot>();
  return {
    moduleName: "InferenceProvider",
    contractVersion: CONTRACT_VERSION,
    describe: describeKiroCli,
    infer: (request) => inferBatch(request, options, slots),
    cancel: async (batchId) => cancelBatch(slots, batchId, options),
    releaseSession: async (batchId) => cancelBatch(slots, batchId, options),
  };
}

async function inferBatch(
  request: InferenceRequest,
  options: KiroCliProviderOptions,
  slots: Map<string, BatchSlot>,
): Promise<InferenceResult> {
  checkRequest(request, options.maxItems, slots);
  // The claim is made synchronously, before the first await, so a second request with the same batch id is refused.
  const slot: BatchSlot = { run: undefined, cancelled: false, kiroSessionId: undefined };
  slots.set(request.batchId, slot);

  let session: RunSession | undefined;
  let outcome = "SUCCEEDED";
  try {
    const model = buildModelInput(request.items);
    session = await openSession(request.batchId, options);
    markRunDirectoryActive(session.directory);
    const stdout = await runCli(request.batchId, model, session, slot, runSettingsOf(request, options), options);
    const items = await decodeResult(request.batchId, request, model, stdout, options.validateOutput);
    return { contractVersion: CONTRACT_VERSION, batchId: request.batchId, items };
  } catch (error) {
    outcome = error instanceof KiroInferenceError ? error.code : "UNEXPECTED";
    throw error;
  } finally {
    slots.delete(request.batchId);
    if (session !== undefined) {
      try {
        await finishSession(session, outcome, slot, options);
      } finally {
        releaseRunDirectory(session.directory);
      }
    }
  }
}

/**
 * Refuses a request the adapter cannot map back or run, before anything is sent. Runtime checks, because callers are not
 * typed.
 */
function checkRequest(request: InferenceRequest, maxItems: number, slots: ReadonlyMap<string, BatchSlot>): void {
  const batchId = typeof request.batchId === "string" ? request.batchId : "";
  const invalid = () => new KiroInferenceError("REQUEST_INVALID", batchId);
  if (batchId === "" || slots.has(batchId)) throw invalid();
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
  checkRunSelection(request.selection, batchId);
}

/**
 * A selection is applied as `--model`, so its model id must have the shape of a flag value. The CLI has no reasoning flag
 * (STORY-010 G4). A run that asks for a reasoning level is refused, because it would run without that level otherwise.
 */
function checkRunSelection(selection: InferenceRequest["selection"], batchId: string): void {
  if (selection === undefined) return;
  const modelId: unknown = selection.modelId;
  if (typeof modelId !== "string" || modelId === "" || modelId.startsWith("-")) {
    throw new KiroInferenceError("REQUEST_INVALID", batchId);
  }
  if (selection.reasoning !== null) throw new KiroInferenceError("SELECTION_UNSUPPORTED", batchId);
}

/** The settings of one run. A request with a selection runs with its model. A request without one keeps the built-in model. */
function runSettingsOf(request: InferenceRequest, options: KiroCliProviderOptions): RunSettings {
  const model = request.selection === undefined ? options.model : request.selection.modelId;
  return { agent: options.agent, model };
}

async function openSession(batchId: string, options: KiroCliProviderOptions): Promise<RunSession> {
  try {
    return await openRunSession(options.runtimeRoot, batchId, (options.now ?? (() => new Date()))());
  } catch {
    throw new KiroInferenceError("SESSION_UNAVAILABLE", batchId);
  }
}

/**
 * Runs one headless CLI process inside the batch's run directory, with the prompt on stdin. Resolves with stdout, or rejects
 * with a run error code.
 */
function runCli(
  batchId: string,
  model: ModelInput,
  session: RunSession,
  slot: BatchSlot,
  settings: RunSettings,
  options: KiroCliProviderOptions,
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const killGraceMs = options.killGraceMs ?? DEFAULT_KILL_GRACE_MS;
  return new Promise<string>((resolve, reject) => {
    if (slot.cancelled) {
      reject(new KiroInferenceError("RUN_CANCELLED", batchId));
      return;
    }

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(options.command, buildChatArguments(settings), {
        cwd: session.directory,
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
    slot.run = run;
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let settled = false;
    // Session ids are recorded while the run is alive, so a server that dies mid-run still leaves the id behind.
    const sessionIds = createSessionIdScanner((kiroSessionId) => {
      slot.kiroSessionId = kiroSessionId;
      void bestEffort(() => session.recordKiroSession(kiroSessionId));
    });

    const finish = (outcome: { readonly stdout: string } | { readonly error: KiroInferenceError }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (run.forceKillTimer !== undefined) clearTimeout(run.forceKillTimer);
      if (slot.run === run) slot.run = undefined;
      if ("error" in outcome) reject(outcome.error);
      else resolve(outcome.stdout);
    };

    const timer = setTimeout(() => stopRun(run, "RUN_TIMEOUT", killGraceMs), timeoutMs);

    child.stdin.on("error", () => {
      // The CLI may exit before it reads its input. Its exit status decides the outcome, so this error is not separate.
    });
    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > maxOutputBytes) {
        stopRun(run, "RUN_OUTPUT_TOO_LARGE", killGraceMs);
        return;
      }
      sessionIds.push(chunk);
      if (run.stopReason === undefined) chunks.push(chunk);
    });
    child.stderr.on("data", () => {
      // stderr is read so the pipe never fills, then dropped. It can carry anything, so it is never kept or echoed.
    });

    child.on("error", () => {
      // An error after the process started (for example a failed kill) is not a spawn failure. Its exit still arrives.
      if (child.pid === undefined) finish({ error: new KiroInferenceError("RUN_SPAWN_FAILED", batchId) });
    });

    child.on("close", (code) => {
      sessionIds.end();
      const stdout = Buffer.concat(chunks).toString("utf8");
      if (run.stopReason !== undefined) {
        finish({ error: new KiroInferenceError(run.stopReason, batchId) });
        return;
      }
      if (code !== 0) {
        finish({ error: new KiroInferenceError("RUN_FAILED", batchId, { exitCode: code ?? undefined }) });
        return;
      }
      finish({ stdout });
    });

    // The process is recorded as running before the prompt is written. If the record cannot be written, the run is stopped.
    // A spawn that failed has no pid; its error event settles the run, so nothing is recorded or written here.
    if (child.pid === undefined) return;
    session.markRunning(child.pid).then(
      () => {
        if (settled || run.stopReason !== undefined) return;
        child.stdin.end(model.prompt, "utf8");
      },
      () => stopRun(run, "SESSION_UNAVAILABLE", killGraceMs),
    );
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

  const validatedByItemId = new Map(outcome.items.map((item) => [item.itemId, item] as const));
  const itemIdByCorrelationId = new Map<string, string>();
  for (const [itemId, correlationId] of model.itemIds) itemIdByCorrelationId.set(correlationId, itemId);

  return request.items.map((item): InferenceResultItem => {
    const itemId = itemIdByCorrelationId.get(item.correlationId);
    const validated = itemId === undefined ? undefined : validatedByItemId.get(itemId);
    if (itemId === undefined || validated === undefined) {
      throw new KiroInferenceError("RUN_OUTPUT_INVALID", batchId, { validationCodes: ["ITEM_RESULT_MISSING"] });
    }
    return resultItemOf(item.correlationId, itemId, validated);
  });
}

/** The result item the caller stores as evidence. A matched span is present only when the validator found one. */
function resultItemOf(correlationId: string, itemId: string, validated: ValidatedOutputItem): InferenceResultItem {
  const result = { correlationId, itemId, classification: validated.verdict, reasonCodes: validated.reasonCodes };
  return validated.matchedSpan === undefined ? result : { ...result, matchedSpan: validated.matchedSpan };
}

/**
 * Records the outcome, asks the CLI to delete its saved session when one was observed, and removes the run directory. It
 * never throws: the business outcome is already decided. A failed record write is not fatal, because the directory and
 * the sweep still cover it. A failed deletion keeps the directory, since its record is the only place the session id
 * remains, and the orphan sweep retries the deletion.
 */
async function finishSession(
  session: RunSession,
  outcome: string,
  slot: BatchSlot,
  options: KiroCliProviderOptions,
): Promise<void> {
  const kiroSessionId = slot.kiroSessionId;
  if (kiroSessionId !== undefined) await bestEffort(() => session.recordKiroSession(kiroSessionId));
  await bestEffort(() => session.finish(outcome));
  const deletion = await requestKiroSessionDeletion({
    command: options.command,
    env: options.env,
    workingDirectory: session.directory,
    sessionId: kiroSessionId,
    timeoutMs: DEFAULT_DELETE_TIMEOUT_MS,
  });
  if (deletion === "DELETE_FAILED") return;
  await removeRunDirectory(options.runtimeRoot, session.directory);
}

async function bestEffort(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch {
    // A failed record write is not a business failure. The directory is removed next, and the sweep handles a leftover.
  }
}

function cancelBatch(slots: ReadonlyMap<string, BatchSlot>, batchId: string, options: KiroCliProviderOptions): void {
  const slot = slots.get(batchId);
  if (slot === undefined) return;
  slot.cancelled = true;
  if (slot.run !== undefined) stopRun(slot.run, "RUN_CANCELLED", options.killGraceMs ?? DEFAULT_KILL_GRACE_MS);
}

/** Stops the batch's process group. The first reason wins, so a timeout is not reported as a cancellation. */
function stopRun(run: ActiveRun, reason: StopReason, killGraceMs: number): void {
  if (run.stopReason !== undefined) return;
  run.stopReason = reason;
  signalProcessGroup(run.child, "SIGTERM");
  run.forceKillTimer = setTimeout(() => signalProcessGroup(run.child, "SIGKILL"), killGraceMs);
}
