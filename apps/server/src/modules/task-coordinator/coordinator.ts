import {
  CONTRACT_VERSION,
  type ChannelEvent,
  type EvidenceEntry,
  type TaskCoordinator,
  type TaskRef,
  type TaskStatus,
  type TechnicalData,
  type TechnicalLevel,
  type TechnicalLogEntry,
  type TechnicalStage,
  type TechnicalStatus,
} from "@voxward/contracts";
import { isExpired, parseDeadline } from "./deadline.js";
import { expectedFactsOf, type CommitOutcome, type ExpectedFacts } from "./generation.js";
import { decideBatch, type BatchCandidate, type BatchLimits } from "./micro-batch.js";
import { orderGate, type OrderedTask } from "./ordering.js";
import { laneMayStart, TASK_LANES, type SlotUsage, type TaskLane } from "./priority.js";
import { decideRetry, type RetryPolicy } from "./retry.js";

/** Identity of one platform message. One event maps to at most one task. */
export interface EventKey {
  readonly channelId: string;
  readonly platformMessageId: string;
}

/** Facts about an event that the database owns. */
export interface TaskFacts {
  readonly eventVersion: number;
  readonly processingGeneration: number;
  readonly deleted: boolean;
}

/**
 * Storage port for the facts that decide whether a result may be written. `commitIfCurrent` compares the expected facts
 * with the stored state and runs `apply` inside one short synchronous transaction, so no other write lands between the
 * check and the write. It must not wait on the network or on a model.
 */
export interface TaskFactsPort {
  readFacts(key: EventKey): TaskFacts;
  commitIfCurrent(key: EventKey, expected: ExpectedFacts, apply: () => void): CommitOutcome;
}

/** Current concurrency limit: an integer of at least 1. */
export interface ConcurrencySource {
  current(): number;
}

/** Receives Technical Log entries. The server binding forwards them to the audit store. */
export interface TechnicalLogSink {
  record(entry: TechnicalLogEntry): void;
}

/** Limits of the coordinator. Each default is an implementation choice that has not been measured (自定). */
export interface CoordinatorLimits {
  readonly maxBatchItems: number;
  readonly maxBatchBytes: number;
  readonly maxBatchWaitMs: number;
  readonly deadlineMarginMs: number;
  readonly maxQueued: Readonly<Record<TaskLane, number>>;
  readonly maxAttempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
}

export const DEFAULT_COORDINATOR_LIMITS: CoordinatorLimits = {
  maxBatchItems: 8,
  maxBatchBytes: 8192,
  maxBatchWaitMs: 200,
  deadlineMarginMs: 1000,
  maxQueued: { PAID: 50, REALTIME: 200, BACKGROUND: 500 },
  maxAttempts: 3,
  backoffBaseMs: 1000,
  backoffCapMs: 8000,
};

export interface CoordinatorLimitOverrides extends Partial<Omit<CoordinatorLimits, "maxQueued">> {
  readonly maxQueued?: Partial<Readonly<Record<TaskLane, number>>>;
}

export interface TaskCoordinatorOptions {
  readonly facts: TaskFactsPort;
  readonly concurrency: ConcurrencySource;
  /** Where Technical Log entries go. Optional, so a test or a dry run needs no audit store. */
  readonly technicalLog?: TechnicalLogSink;
  /** Time source. Defaults to the system clock. */
  readonly clock?: () => Date;
  /** Identifier source for task and batch ids. Defaults to the Web Crypto UUID. */
  readonly newId?: () => string;
  readonly limits?: CoordinatorLimitOverrides;
}

/** One task inside a batch, as the executor needs it. */
export interface BatchTask {
  readonly taskId: string;
  readonly correlationId: string;
  readonly text: string;
  readonly attempt: number;
}

/** One micro-batch. It holds one concurrency slot until `finishBatch` releases it. */
export interface TaskBatch {
  readonly batchId: string;
  readonly lane: TaskLane;
  readonly tasks: readonly BatchTask[];
}

/** The outcome of one task, held by the caller until commit. */
export interface TaskResult {
  /** Runs inside the fact store's transaction, and only after the expected facts still hold. */
  readonly apply: () => void;
  /** Technical Log evidence, such as ITEM_ID_MAP and VALIDATED_JSON. Written only when the result commits. */
  readonly evidence: readonly EvidenceEntry[];
}

export type CommitResult =
  | { readonly status: "committed" }
  | { readonly status: "waiting"; readonly waitingOn: string }
  | { readonly status: "discarded"; readonly reason: string }
  | { readonly status: "failed"; readonly reason: string };

export type FailureOutcome =
  | { readonly status: "retry_scheduled"; readonly notBeforeMs: number }
  | { readonly status: "pending_review"; readonly reason: string }
  | { readonly status: "ignored"; readonly reason: string };

/** The contract plus the entry points the contract does not have yet. */
export interface TaskCoordinatorService extends TaskCoordinator {
  enqueueInLane(lane: TaskLane, event: ChannelEvent, deadlineAt: string): Promise<TaskRef>;
  reasonOf(taskId: string): Promise<string | null>;
  takeBatch(): Promise<TaskBatch | null>;
  reportFailure(taskId: string, errorCode: string): Promise<FailureOutcome>;
  commitResult(taskId: string, result: TaskResult): Promise<CommitResult>;
  finishBatch(batchId: string): Promise<void>;
  cancelEvent(key: EventKey): Promise<{ readonly cancelledTaskIds: readonly string[] }>;
  idleBatchIds(): Promise<readonly string[]>;
  sweep(): Promise<number>;
}

/** A caller-supplied value failed validation. The message names the field, never the value. */
export class TaskInputError extends Error {
  readonly code = "TASK_INPUT_INVALID";
  constructor(readonly field: string) {
    super(`TASK_INPUT_INVALID: ${field}`);
    this.name = "TaskInputError";
  }
}

export class TaskNotFoundError extends Error {
  readonly code = "TASK_NOT_FOUND";
  constructor(readonly taskId: string) {
    super(`TASK_NOT_FOUND: ${taskId}`);
    this.name = "TaskNotFoundError";
  }
}

/** A configured limit is not a usable value. The message names the key only. */
export class TaskConfigError extends Error {
  readonly code = "TASK_CONFIG_INVALID";
  constructor(readonly key: string) {
    super(`TASK_CONFIG_INVALID: ${key}`);
    this.name = "TaskConfigError";
  }
}

/** Same shape the Technical Log accepts for an error code. */
const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

/**
 * One task. Settling it releases the message text. The record itself stays, so a status query and a repeated event can
 * still be answered (N2).
 */
interface TaskRecord {
  readonly taskId: string;
  readonly lane: TaskLane;
  readonly channelId: string;
  readonly platformMessageId: string;
  readonly platformOrder: number;
  readonly correlationId: string;
  /** Internal subject reference, fixed at enqueue time. */
  readonly subjectRef: string;
  readonly deadlineAt: string;
  readonly deadlineMs: number;
  readonly enqueuedMs: number;
  readonly bytes: number;
  readonly eventVersion: number;
  readonly processingGeneration: number;
  /** The message text. Empty once the task settles. */
  body: string;
  status: TaskStatus;
  attempts: number;
  notBeforeMs: number;
  batchId: string | null;
  reason: string | null;
  orderNote: string | null;
}

function keyOf(event: ChannelEvent): EventKey {
  return { channelId: event.channelId, platformMessageId: event.platformMessageId };
}

function keyOfTask(task: TaskRecord): EventKey {
  return { channelId: task.channelId, platformMessageId: task.platformMessageId };
}

function eventIndexOf(key: EventKey): string {
  return JSON.stringify([key.channelId, key.platformMessageId]);
}

/** Adds a task to one bucket of an index, creating the bucket on first use. */
function indexAdd(index: Map<string, Map<string, TaskRecord>>, key: string, task: TaskRecord): void {
  const bucket = index.get(key) ?? new Map<string, TaskRecord>();
  bucket.set(task.taskId, task);
  index.set(key, bucket);
}

/** Removes a task from one bucket. An empty bucket is dropped, so the index holds only open work. */
function indexRemove(index: Map<string, Map<string, TaskRecord>>, key: string, taskId: string): void {
  const bucket = index.get(key);
  if (bucket === undefined) return;
  bucket.delete(taskId);
  if (bucket.size === 0) index.delete(key);
}

/** Internal subject reference: the channel plus the sender reference, as in the moderation module (自定). */
function subjectRefOf(event: ChannelEvent): string {
  return `${event.channelId}/${event.sender.senderRef}`;
}

function requireText(value: unknown, field: string): void {
  if (typeof value !== "string" || value.length === 0) throw new TaskInputError(field);
}

function validateEvent(event: ChannelEvent): void {
  requireText(event.channelId, "channelId");
  requireText(event.platformMessageId, "platformMessageId");
  requireText(event.correlationId, "correlationId");
  requireText(event.sender?.senderRef, "senderRef");
  if (typeof event.body !== "string") throw new TaskInputError("body");
  if (!Number.isInteger(event.platformOrder)) throw new TaskInputError("platformOrder");
}

function resolveLimits(overrides: CoordinatorLimitOverrides | undefined): CoordinatorLimits {
  const defaults = DEFAULT_COORDINATOR_LIMITS;
  const limits: CoordinatorLimits = {
    maxBatchItems: overrides?.maxBatchItems ?? defaults.maxBatchItems,
    maxBatchBytes: overrides?.maxBatchBytes ?? defaults.maxBatchBytes,
    maxBatchWaitMs: overrides?.maxBatchWaitMs ?? defaults.maxBatchWaitMs,
    deadlineMarginMs: overrides?.deadlineMarginMs ?? defaults.deadlineMarginMs,
    maxQueued: { ...defaults.maxQueued, ...overrides?.maxQueued },
    maxAttempts: overrides?.maxAttempts ?? defaults.maxAttempts,
    backoffBaseMs: overrides?.backoffBaseMs ?? defaults.backoffBaseMs,
    backoffCapMs: overrides?.backoffCapMs ?? defaults.backoffCapMs,
  };
  validateLimits(limits);
  return limits;
}

function validateLimits(limits: CoordinatorLimits): void {
  const checks: ReadonlyArray<readonly [string, number, number]> = [
    ["maxBatchItems", limits.maxBatchItems, 1],
    ["maxBatchBytes", limits.maxBatchBytes, 1],
    ["maxBatchWaitMs", limits.maxBatchWaitMs, 0],
    ["deadlineMarginMs", limits.deadlineMarginMs, 0],
    ["maxAttempts", limits.maxAttempts, 1],
    ["backoffBaseMs", limits.backoffBaseMs, 0],
    ["backoffCapMs", limits.backoffCapMs, 0],
    ...TASK_LANES.map((lane): readonly [string, number, number] => [`maxQueued.${lane}`, limits.maxQueued[lane], 1]),
  ];
  for (const [key, value, minimum] of checks) {
    if (!Number.isInteger(value) || value < minimum) throw new TaskConfigError(key);
  }
  if (limits.backoffCapMs < limits.backoffBaseMs) throw new TaskConfigError("backoffCapMs");
}

/**
 * The coordinator state machine. Each method runs its checks and state changes without yielding, so a call never
 * interleaves with another call. The methods return promises only to match the contract.
 */
export function createCoordinator(options: TaskCoordinatorOptions): TaskCoordinatorService {
  const facts = options.facts;
  const limits = resolveLimits(options.limits);
  const retryPolicy: RetryPolicy = {
    maxAttempts: limits.maxAttempts,
    backoffBaseMs: limits.backoffBaseMs,
    backoffCapMs: limits.backoffCapMs,
  };
  const batchLimits: BatchLimits = {
    maxItems: limits.maxBatchItems,
    maxBytes: limits.maxBatchBytes,
    maxWaitMs: limits.maxBatchWaitMs,
    deadlineMarginMs: limits.deadlineMarginMs,
  };
  const clock = options.clock ?? (() => new Date());
  const newId = options.newId ?? (() => globalThis.crypto.randomUUID());
  /** Every task accepted by this process, by id. Settled records stay for status queries. */
  const tasks = new Map<string, TaskRecord>();
  /** One event maps to at most one task, so a repeated event never runs twice. */
  const taskByEvent = new Map<string, string>();
  /** Open tasks (QUEUED or RUNNING), by lane and by channel. Scheduling reads these, never the settled history. */
  const openByLane = new Map<string, Map<string, TaskRecord>>();
  const openByChannel = new Map<string, Map<string, TaskRecord>>();
  /** Batches that hold a concurrency slot, with their lane and tasks. A slot is released by `finishBatch`. */
  const slots = new Map<string, { readonly lane: TaskLane; readonly tasks: readonly TaskRecord[] }>();

  const nowMs = (): number => clock().getTime();

  function requireTask(taskId: string): TaskRecord {
    const task = tasks.get(taskId);
    if (task === undefined) throw new TaskNotFoundError(taskId);
    return task;
  }

  function queuedTasks(lane: TaskLane): TaskRecord[] {
    return [...(openByLane.get(lane)?.values() ?? [])].filter((task) => task.status === "QUEUED");
  }

  function usage(): SlotUsage {
    let background = 0;
    for (const slot of slots.values()) {
      if (slot.lane === "BACKGROUND") background += 1;
    }
    return { total: slots.size, background };
  }

  function currentLimit(): number {
    const limit = options.concurrency.current();
    if (!Number.isInteger(limit) || limit < 1) throw new TaskConfigError("concurrency");
    return limit;
  }

  /** Whether a batch still has a task running under it. A task that moved to a later batch does not count. */
  function batchIsRunning(batchId: string, batchTasks: readonly TaskRecord[]): boolean {
    return batchTasks.some((task) => task.batchId === batchId && task.status === "RUNNING");
  }

  function openTask(task: TaskRecord): void {
    indexAdd(openByLane, task.lane, task);
    indexAdd(openByChannel, task.channelId, task);
  }

  /** A settled task leaves the open indexes and releases its message text. The record stays for queries. */
  function closeTask(task: TaskRecord): void {
    indexRemove(openByLane, task.lane, task.taskId);
    indexRemove(openByChannel, task.channelId, task.taskId);
    task.body = "";
  }

  function refOf(task: TaskRecord): TaskRef {
    return {
      contractVersion: CONTRACT_VERSION,
      taskId: task.taskId,
      eventVersion: task.eventVersion,
      processingGeneration: task.processingGeneration,
      deadlineAt: task.deadlineAt,
    };
  }

  function orderedOf(task: TaskRecord): OrderedTask {
    return {
      taskId: task.taskId,
      channelId: task.channelId,
      lane: task.lane,
      platformOrder: task.platformOrder,
      status: task.status,
      deadlineMs: task.deadlineMs,
    };
  }

  function orderedTasksOf(channelId: string): OrderedTask[] {
    return [...(openByChannel.get(channelId)?.values() ?? [])].map(orderedOf);
  }

  /** Why a task that is no longer running cannot take a result. */
  function staleReasonOf(task: TaskRecord): string {
    if (task.status === "DONE") return "ALREADY_SETTLED";
    if (task.status === "DISCARDED" || task.status === "PENDING_REVIEW") return task.reason ?? task.status;
    return "NOT_RUNNING";
  }

  function log(
    task: TaskRecord,
    stage: TechnicalStage,
    status: TechnicalStatus,
    level: TechnicalLevel,
    errorCode: string | null,
    data: TechnicalData | null,
    evidence: readonly EvidenceEntry[],
  ): void {
    options.technicalLog?.record({
      contractVersion: CONTRACT_VERSION,
      kind: "TECHNICAL",
      channelId: task.channelId,
      correlationId: task.correlationId,
      stage,
      status,
      level,
      subjectRef: task.subjectRef,
      batchId: task.batchId,
      taskId: task.taskId,
      attempt: task.attempts > 0 ? task.attempts : null,
      errorCode,
      providerRef: null,
      modelRef: null,
      ruleTemplateVersion: null,
      latencyMs: null,
      data,
      evidence,
    });
  }

  /**
   * Moves a task to a terminal state and records why. Deadline expiry is TIMED_OUT, other failures are FAILED, and
   * discards are SKIPPED. A failure never becomes an allow or a deduction.
   */
  function settleAs(
    task: TaskRecord,
    status: "PENDING_REVIEW" | "DISCARDED",
    reason: string,
    stage: TechnicalStage,
    errorCode: string = reason,
  ): void {
    task.status = status;
    task.reason = reason;
    closeTask(task);
    if (reason === "DEADLINE_EXCEEDED") {
      log(task, stage, "TIMED_OUT", "WARN", "DEADLINE_EXCEEDED", { reason }, []);
      return;
    }
    if (status === "PENDING_REVIEW") {
      log(task, stage, "FAILED", "ERROR", errorCode, { reason }, []);
      return;
    }
    log(task, stage, "SKIPPED", "INFO", null, { reason }, []);
  }

  /** The reason recorded when the ordering gate advanced past an unfinished predecessor, if any. */
  function orderDataOf(task: TaskRecord): TechnicalData | null {
    return task.orderNote === null ? null : { orderNote: task.orderNote };
  }

  /** Refusal reason for a new task, or null when it may queue. Checked before the task joins the queue. */
  function admissionRefusal(
    lane: TaskLane,
    bytes: number,
    current: TaskFacts,
    deadlineMs: number,
    now: number,
  ): { readonly status: "PENDING_REVIEW" | "DISCARDED"; readonly reason: string } | null {
    if (current.deleted) return { status: "DISCARDED", reason: "DATA_DELETED" };
    if (isExpired(deadlineMs, now)) return { status: "PENDING_REVIEW", reason: "DEADLINE_EXCEEDED" };
    if (bytes > limits.maxBatchBytes) return { status: "PENDING_REVIEW", reason: "INPUT_TOO_LARGE" };
    if (queuedTasks(lane).length >= limits.maxQueued[lane]) return { status: "PENDING_REVIEW", reason: "QUEUE_FULL" };
    return null;
  }

  /** Expired tasks go to the human queue. Nothing is allowed and nothing is deducted. */
  function sweepExpired(now: number): number {
    let moved = 0;
    for (const bucket of openByLane.values()) {
      for (const task of [...bucket.values()]) {
        if (!isExpired(task.deadlineMs, now)) continue;
        settleAs(task, "PENDING_REVIEW", "DEADLINE_EXCEEDED", "ERROR");
        moved += 1;
      }
    }
    return moved;
  }

  async function enqueueInLane(lane: TaskLane, event: ChannelEvent, deadlineAt: string): Promise<TaskRef> {
    validateEvent(event);
    const deadlineMs = parseDeadline(deadlineAt);
    if (deadlineMs === null) throw new TaskInputError("deadlineAt");

    const key = keyOf(event);
    const existingId = taskByEvent.get(eventIndexOf(key));
    if (existingId !== undefined) return refOf(requireTask(existingId));

    const now = nowMs();
    const current = facts.readFacts(key);
    const bytes = Buffer.byteLength(event.body, "utf8");
    const refusal = admissionRefusal(lane, bytes, current, deadlineMs, now);
    const task: TaskRecord = {
      taskId: newId(),
      lane,
      channelId: event.channelId,
      platformMessageId: event.platformMessageId,
      platformOrder: event.platformOrder,
      correlationId: event.correlationId,
      subjectRef: subjectRefOf(event),
      deadlineAt,
      deadlineMs,
      enqueuedMs: now,
      bytes,
      eventVersion: current.eventVersion,
      processingGeneration: current.processingGeneration,
      body: event.body,
      status: "QUEUED",
      attempts: 0,
      notBeforeMs: 0,
      batchId: null,
      reason: null,
      orderNote: null,
    };
    tasks.set(task.taskId, task);
    taskByEvent.set(eventIndexOf(key), task.taskId);
    if (refusal === null) {
      openTask(task);
    } else {
      settleAs(task, refusal.status, refusal.reason, "INGEST");
    }
    return refOf(task);
  }

  async function takeBatch(): Promise<TaskBatch | null> {
    const now = nowMs();
    sweepExpired(now);
    const limit = currentLimit();
    for (const lane of TASK_LANES) {
      if (!laneMayStart(lane, usage(), limit)) continue;
      const eligible = queuedTasks(lane).filter((task) => task.notBeforeMs <= now);
      const candidates: BatchCandidate[] = eligible.map((task) => ({
        bytes: task.bytes,
        enqueuedMs: task.enqueuedMs,
        deadlineMs: task.deadlineMs,
      }));
      const decision = decideBatch(candidates, batchLimits, now);
      if (decision.kind === "hold") continue;

      const picked = eligible.slice(0, decision.count);
      const batchId = newId();
      slots.set(batchId, { lane, tasks: picked });
      for (const task of picked) {
        task.status = "RUNNING";
        task.attempts += 1;
        task.batchId = batchId;
      }
      return {
        batchId,
        lane,
        tasks: picked.map((task) => ({
          taskId: task.taskId,
          correlationId: task.correlationId,
          text: task.body,
          attempt: task.attempts,
        })),
      };
    }
    return null;
  }

  async function finishBatch(batchId: string): Promise<void> {
    slots.delete(batchId);
  }

  async function reportFailure(taskId: string, errorCode: string): Promise<FailureOutcome> {
    if (!ERROR_CODE.test(errorCode)) throw new TaskInputError("errorCode");
    const task = tasks.get(taskId);
    if (task === undefined) return { status: "ignored", reason: "UNKNOWN_TASK" };
    if (task.status !== "RUNNING") return { status: "ignored", reason: staleReasonOf(task) };

    const now = nowMs();
    const decision = decideRetry({
      attemptsDone: task.attempts,
      errorCode,
      nowMs: now,
      deadlineMs: task.deadlineMs,
      policy: retryPolicy,
    });
    if (decision.kind === "retry") {
      log(task, "ERROR", "FAILED", "WARN", errorCode, { reason: "RETRY_SCHEDULED" }, []);
      task.status = "QUEUED";
      task.batchId = null;
      task.notBeforeMs = now + decision.delayMs;
      return { status: "retry_scheduled", notBeforeMs: task.notBeforeMs };
    }
    const reason = decision.reason === "NOT_RETRYABLE" ? errorCode : decision.reason;
    settleAs(task, "PENDING_REVIEW", reason, "ERROR", errorCode);
    return { status: "pending_review", reason };
  }

  async function commitResult(taskId: string, result: TaskResult): Promise<CommitResult> {
    const task = tasks.get(taskId);
    if (task === undefined) return { status: "discarded", reason: "UNKNOWN_TASK" };
    if (task.status !== "RUNNING") return { status: "discarded", reason: staleReasonOf(task) };

    const now = nowMs();
    if (isExpired(task.deadlineMs, now)) {
      // Same outcome as the expiry sweep: nothing is written, and the task goes to human review (N1).
      settleAs(task, "PENDING_REVIEW", "DEADLINE_EXCEEDED", "COMMIT");
      return { status: "discarded", reason: "DEADLINE_EXCEEDED" };
    }

    const gate = orderGate(orderedOf(task), orderedTasksOf(task.channelId), now);
    if (gate.kind === "wait") return { status: "waiting", waitingOn: gate.waitingOn };
    if (gate.kind === "advanced") task.orderNote = `PREDECESSOR_UNFINISHED:${gate.unfinished}`;

    let outcome: CommitOutcome;
    try {
      outcome = facts.commitIfCurrent(keyOfTask(task), expectedFactsOf(task), result.apply);
    } catch {
      settleAs(task, "PENDING_REVIEW", "COMMIT_FAILED", "COMMIT");
      return { status: "failed", reason: "COMMIT_FAILED" };
    }
    if (outcome.status === "stale") {
      settleAs(task, "DISCARDED", outcome.reason, "COMMIT");
      return { status: "discarded", reason: outcome.reason };
    }
    task.status = "DONE";
    closeTask(task);
    log(task, "COMMIT", "OK", "INFO", null, orderDataOf(task), result.evidence);
    return { status: "committed" };
  }

  async function cancelEvent(key: EventKey): Promise<{ readonly cancelledTaskIds: readonly string[] }> {
    const taskId = taskByEvent.get(eventIndexOf(key));
    if (taskId === undefined) return { cancelledTaskIds: [] };
    const task = requireTask(taskId);
    if (task.status !== "QUEUED" && task.status !== "RUNNING") return { cancelledTaskIds: [] };
    settleAs(task, "DISCARDED", "CANCELLED", "COMMIT");
    return { cancelledTaskIds: [task.taskId] };
  }

  async function idleBatchIds(): Promise<readonly string[]> {
    const idle: string[] = [];
    for (const [batchId, slot] of slots) {
      if (!batchIsRunning(batchId, slot.tasks)) idle.push(batchId);
    }
    return idle;
  }

  return {
    moduleName: "TaskCoordinator",
    contractVersion: CONTRACT_VERSION,
    enqueue: (event, deadlineAt) => enqueueInLane("REALTIME", event, deadlineAt),
    enqueueInLane,
    statusOf: async (taskId) => requireTask(taskId).status,
    reasonOf: async (taskId) => requireTask(taskId).reason,
    takeBatch,
    reportFailure,
    commitResult,
    finishBatch,
    cancelEvent,
    idleBatchIds,
    sweep: async () => sweepExpired(nowMs()),
  };
}
