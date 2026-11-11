import { CONTRACT_VERSION, type ChannelEvent, type TechnicalLogEntry } from "@voxward/contracts";
import {
  createTaskCoordinator,
  type CommitOutcome,
  type ConcurrencySource,
  type CoordinatorLimitOverrides,
  type EventKey,
  type ExpectedFacts,
  type StaleReason,
  type TaskBatch,
  type TaskCoordinatorService,
  type TaskFacts,
  type TaskFactsPort,
  type TaskResult,
  type TechnicalLogSink,
} from "../../src/modules/task-coordinator/index.js";

export const START = "2026-11-11T06:00:00.000Z";

/** A clock the test moves by hand. */
export class FakeClock {
  private current: number;

  constructor(startIso: string = START) {
    this.current = Date.parse(startIso);
  }

  readonly now = (): Date => new Date(this.current);

  advance(ms: number): void {
    this.current += ms;
  }

  /** ISO timestamp `offsetMs` after the current instant. */
  at(offsetMs: number): string {
    return new Date(this.current + offsetMs).toISOString();
  }
}

export interface EventOverrides {
  readonly channelId?: string;
  readonly platformMessageId?: string;
  readonly platformOrder?: number;
  readonly body?: string;
  readonly senderRef?: string;
}

/** A synthetic channel event. Test data only, never a real viewer. */
export function eventOf(overrides: EventOverrides = {}): ChannelEvent {
  const messageId = overrides.platformMessageId ?? "msg-1";
  return {
    contractVersion: CONTRACT_VERSION,
    platform: "synthetic",
    channelId: overrides.channelId ?? "ch-1",
    platformMessageId: messageId,
    platformOrder: overrides.platformOrder ?? 1,
    receivedAt: START,
    correlationId: `corr-${overrides.channelId ?? "ch-1"}-${messageId}`,
    body: overrides.body ?? "synthetic text",
    sender: { contractVersion: CONTRACT_VERSION, senderRef: overrides.senderRef ?? "viewer-1" },
  };
}

export function keyOfEvent(event: ChannelEvent): EventKey {
  return { channelId: event.channelId, platformMessageId: event.platformMessageId };
}

interface EventState {
  eventVersion: number;
  processingGeneration: number;
  deleted: boolean;
  readonly settled: Set<string>;
}

function staleOf(state: EventState, expected: ExpectedFacts): StaleReason | null {
  if (state.deleted) return "DATA_DELETED";
  if (state.processingGeneration !== expected.processingGeneration) return "GENERATION_CHANGED";
  if (state.eventVersion !== expected.eventVersion) return "VERSION_SUPERSEDED";
  if (state.settled.has(expected.taskId)) return "ALREADY_SETTLED";
  return null;
}

/**
 * In-memory fact store for tests. It follows the port contract: the checks run in the documented order, a failed check
 * writes nothing, and a successful check runs `apply` once. The methods below stand in for manual decisions, data
 * deletion and writers outside the coordinator.
 */
export class FakeFacts implements TaskFactsPort {
  private readonly events = new Map<string, EventState>();
  /** Task ids whose `apply` ran, in order. */
  readonly applied: string[] = [];
  private failNext = false;

  readFacts(key: EventKey): TaskFacts {
    const state = this.stateOf(key);
    return {
      eventVersion: state.eventVersion,
      processingGeneration: state.processingGeneration,
      deleted: state.deleted,
    };
  }

  commitIfCurrent(key: EventKey, expected: ExpectedFacts, apply: () => void): CommitOutcome {
    const state = this.stateOf(key);
    const stale = staleOf(state, expected);
    if (stale !== null) return { status: "stale", reason: stale };
    if (this.failNext) {
      this.failNext = false;
      throw new Error("synthetic storage failure");
    }
    apply();
    this.applied.push(expected.taskId);
    state.settled.add(expected.taskId);
    return { status: "committed" };
  }

  /** A manual decision replaces the verdict, so the event version moves on. */
  supersede(key: EventKey): void {
    this.stateOf(key).eventVersion += 1;
  }

  /** Data deletion moves the processing generation and marks the event deleted. */
  deleteData(key: EventKey): void {
    const state = this.stateOf(key);
    state.deleted = true;
    state.processingGeneration += 1;
  }

  /** A generation change without deletion. */
  bumpGeneration(key: EventKey): void {
    this.stateOf(key).processingGeneration += 1;
  }

  /** Another writer settles the task, outside the coordinator. */
  markSettled(key: EventKey, taskId: string): void {
    this.stateOf(key).settled.add(taskId);
  }

  /** The next commit fails inside the transaction, after its checks and before any write. */
  failNextCommit(): void {
    this.failNext = true;
  }

  private stateOf(key: EventKey): EventState {
    const id = JSON.stringify([key.channelId, key.platformMessageId]);
    let state = this.events.get(id);
    if (state === undefined) {
      state = { eventVersion: 1, processingGeneration: 1, deleted: false, settled: new Set() };
      this.events.set(id, state);
    }
    return state;
  }
}

/** Keeps every Technical Log entry in memory. */
export class RecordingLog implements TechnicalLogSink {
  readonly entries: TechnicalLogEntry[] = [];

  record(entry: TechnicalLogEntry): void {
    this.entries.push(entry);
  }

  forTask(taskId: string): TechnicalLogEntry[] {
    return this.entries.filter((entry) => entry.taskId === taskId);
  }
}

/** A concurrency limit the test can change. */
export class MutableConcurrency implements ConcurrencySource {
  constructor(private value: number) {}

  current(): number {
    return this.value;
  }

  set(value: number): void {
    this.value = value;
  }
}

/** Identifiers that read as `id-1`, `id-2`, ... so assertions stay readable. */
export function sequentialIds(prefix = "id"): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}-${counter}`;
  };
}

export interface Harness {
  readonly clock: FakeClock;
  readonly facts: FakeFacts;
  readonly log: RecordingLog;
  readonly concurrency: MutableConcurrency;
  readonly coordinator: TaskCoordinatorService;
}

export interface HarnessOptions {
  readonly limit?: number;
  readonly limits?: CoordinatorLimitOverrides;
}

/**
 * A coordinator wired to fakes. Batches flush at once by default (`maxBatchWaitMs` 0), so a test does not wait for a
 * window. Tests that exercise the window set their own limit.
 */
export function harnessWith(options: HarnessOptions = {}): Harness {
  const clock = new FakeClock();
  const facts = new FakeFacts();
  const log = new RecordingLog();
  const concurrency = new MutableConcurrency(options.limit ?? 4);
  const coordinator = createTaskCoordinator({
    facts,
    concurrency,
    technicalLog: log,
    clock: clock.now,
    newId: sequentialIds(),
    limits: { maxBatchWaitMs: 0, ...options.limits },
  });
  return { clock, facts, log, concurrency, coordinator };
}

/** A result whose `apply` records the write in the fact store's log. */
export function resultFor(taskId: string): TaskResult {
  return {
    apply: () => undefined,
    evidence: [
      { kind: "ITEM_ID_MAP", payload: JSON.stringify({ [taskId]: "corr" }) },
      { kind: "VALIDATED_JSON", payload: JSON.stringify({ verdict: "ALLOW" }) },
    ],
  };
}

/** The next batch. Fails the test when there is none. */
export async function mustTake(coordinator: TaskCoordinatorService): Promise<TaskBatch> {
  const batch = await coordinator.takeBatch();
  if (batch === null) throw new Error("expected a batch to be ready");
  return batch;
}
