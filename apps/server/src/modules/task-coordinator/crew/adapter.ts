import type { InferenceResultItem } from "@voxward/contracts";
import type { EventKey, TaskBatch, TaskCoordinatorService, TaskResult } from "../coordinator.js";

/** One task as Crew receives it. */
export interface CrewJobItem {
  readonly taskId: string;
  readonly correlationId: string;
  readonly text: string;
}

/** One batch as Crew receives it. */
export interface CrewJob {
  readonly batchId: string;
  readonly items: readonly CrewJobItem[];
}

/**
 * How a Crew session ended. `completed` carries the validated items the session returned. The session status is not a
 * verdict: each task takes its verdict only from its own validated item. The items must already have passed S007's
 * batch validation (VW-R-008). This module only matches them to tasks.
 */
export type CrewReport =
  | { readonly kind: "completed"; readonly items: readonly InferenceResultItem[] }
  | { readonly kind: "failed"; readonly errorCode: string };

export interface CrewHandle {
  /** Crew's reference to the running session. Used for cancel. */
  readonly crewRef: string;
  /** Settles once, when the session ends. */
  readonly done: Promise<CrewReport>;
}

/**
 * The part of Kiro Crew this module uses. Real Crew behavior is not verified here. The binding is deployment work
 * (S029), and tests use a replacement. Content that Crew keeps after a session ends is cleaned up by the binding, after
 * `done` or `cancel` (VW-R-009). This port has no cleanup step.
 */
export interface CrewPort {
  /** Starts one session. Rejects when Crew cannot take the job. */
  start(job: CrewJob): Promise<CrewHandle>;
  /**
   * Cancels a running session. The executor does not wait for the answer: until Crew accepts, the batch keeps its slot,
   * and the pump goes on with other batches (design section 9). A cancel that never returns keeps one slot for good, so
   * the binding must bound it (S029).
   */
  cancel(crewRef: string): Promise<void>;
}

/** Writes one validated item as the verdict. It runs inside the fact store's commit transaction. */
export type VerdictWriter = (taskId: string, item: InferenceResultItem) => void;

export interface CrewExecutorOptions {
  readonly coordinator: TaskCoordinatorService;
  readonly crew: CrewPort;
  readonly writeVerdict: VerdictWriter;
}

export interface CrewExecutor {
  /**
   * Settles finished work, cancels sessions that no longer serve a live task, retries waiting commits, and then starts
   * batches within the concurrency limit. Returns how many sessions it started. It waits neither for those sessions nor
   * for the cancels it sends.
   */
  pump(): Promise<number>;
  /** Cancels an event's work now, and cancels the sessions that have nothing left to serve. */
  cancelEvent(key: EventKey): Promise<void>;
  /** Resolves once every session started so far has reported. For shutdown and tests. */
  drain(): Promise<void>;
}

/** Crew could not serve the job. Never allowed by default. */
const CREW_UNAVAILABLE = "CREW_UNAVAILABLE";
/** A session finished, but a task has no single validated item. The session status is not a verdict. */
const INVALID_OUTPUT = "INVALID_OUTPUT";
/** Crew reported a code the Technical Log cannot record. */
const CREW_FAILED = "CREW_FAILED";
const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

interface Session {
  readonly batch: TaskBatch;
  crewRef: string | null;
  reported: boolean;
  abandoned: boolean;
}

/** A cancel that Crew has not accepted yet. */
interface PendingCancel {
  /** The batch whose slot this cancel releases, or null when the slot was already released. */
  readonly batchId: string | null;
  /** A cancel call is outstanding. The next pump sends again only after that call is refused. */
  sending: boolean;
}

function matchItem(items: readonly InferenceResultItem[], correlationId: string): InferenceResultItem | null {
  const matches = items.filter((item) => item.correlationId === correlationId);
  const [only] = matches;
  return matches.length === 1 && only !== undefined ? only : null;
}

function resultOf(taskId: string, item: InferenceResultItem, writeVerdict: VerdictWriter): TaskResult {
  return {
    apply: () => writeVerdict(taskId, item),
    evidence: [
      { kind: "ITEM_ID_MAP", payload: JSON.stringify({ [item.itemId]: item.correlationId }) },
      { kind: "VALIDATED_JSON", payload: JSON.stringify(item) },
    ],
  };
}

/**
 * Runs coordinator batches as Crew sessions. The executor holds no business state: it submits, reports the outcome of
 * each task, and releases slots. Everything that decides a verdict stays in the coordinator and the fact store.
 */
export function createCrewExecutor(options: CrewExecutorOptions): CrewExecutor {
  const { coordinator, crew, writeVerdict } = options;
  const sessions = new Map<string, Session>();
  const running = new Set<Promise<void>>();
  /** Results whose commit must wait for an earlier message. Retried on the next pump. */
  const parked = new Map<string, TaskResult>();
  /** Cancels not yet accepted by Crew, keyed by Crew's session reference. */
  const pendingCancels = new Map<string, PendingCancel>();

  function trackRun(run: Promise<void>): void {
    running.add(run);
    void run.catch(() => undefined).then(() => running.delete(run));
  }

  async function failAll(batch: TaskBatch, errorCode: string): Promise<void> {
    for (const task of batch.tasks) {
      await coordinator.reportFailure(task.taskId, errorCode);
    }
  }

  async function endSession(batchId: string): Promise<void> {
    sessions.delete(batchId);
    await coordinator.finishBatch(batchId);
  }

  async function commitItem(taskId: string, item: InferenceResultItem): Promise<void> {
    const result = resultOf(taskId, item, writeVerdict);
    const outcome = await coordinator.commitResult(taskId, result);
    if (outcome.status === "waiting") {
      parked.set(taskId, result);
      return;
    }
    parked.delete(taskId);
  }

  async function settle(batch: TaskBatch, report: CrewReport): Promise<void> {
    if (report.kind === "failed") {
      const code = ERROR_CODE.test(report.errorCode) ? report.errorCode : CREW_FAILED;
      await failAll(batch, code);
      return;
    }
    for (const task of batch.tasks) {
      const item = matchItem(report.items, task.correlationId);
      if (item === null) {
        await coordinator.reportFailure(task.taskId, INVALID_OUTPUT);
        continue;
      }
      await commitItem(task.taskId, item);
    }
  }

  /**
   * Runs one batch as one Crew session. An unexpected error must not leave tasks waiting with no path to a verdict, so
   * the batch fails explicitly and its slot is released. Anything that still cannot finish is caught by the deadline.
   */
  async function runSession(batch: TaskBatch): Promise<void> {
    try {
      await runSessionSteps(batch);
    } catch {
      await failAll(batch, CREW_FAILED).catch(() => undefined);
      await endSession(batch.batchId).catch(() => undefined);
    }
  }

  async function runSessionSteps(batch: TaskBatch): Promise<void> {
    const session: Session = { batch, crewRef: null, reported: false, abandoned: false };
    sessions.set(batch.batchId, session);
    const job: CrewJob = {
      batchId: batch.batchId,
      items: batch.tasks.map((task) => ({ taskId: task.taskId, correlationId: task.correlationId, text: task.text })),
    };

    let handle: CrewHandle;
    try {
      handle = await crew.start(job);
    } catch {
      await failAll(batch, CREW_UNAVAILABLE);
      await endSession(batch.batchId);
      return;
    }

    session.crewRef = handle.crewRef;
    if (session.abandoned) {
      // The batch was released while Crew was still starting the session, so no slot is left to hold. Ask Crew to
      // cancel without waiting; a refused cancel is sent again by the next pump.
      handle.done.catch(() => undefined);
      requestCancel(handle.crewRef, null);
      sendPendingCancels();
      return;
    }

    const report = await handle.done.catch((): CrewReport => ({ kind: "failed", errorCode: CREW_UNAVAILABLE }));
    session.reported = true;
    pendingCancels.delete(handle.crewRef);
    if (!session.abandoned) await settle(batch, report);
    await endSession(batch.batchId);
  }

  /**
   * Starts a cancel for each session that serves no live task. A batch's slot is released only when Crew accepts the
   * cancel, or when the session has already reported: freeing it earlier would let the host run more sessions than its
   * limit. Nothing here waits for Crew, so a cancel that never answers keeps its slot and the pump goes on.
   */
  async function reapIdle(): Promise<void> {
    for (const batchId of await coordinator.idleBatchIds()) {
      const session = sessions.get(batchId);
      if (session === undefined) {
        await coordinator.finishBatch(batchId);
        continue;
      }
      session.abandoned = true;
      if (session.crewRef === null || session.reported) {
        // No Crew session is open for this batch: none has started, or it has already reported.
        await endSession(batchId);
        continue;
      }
      requestCancel(session.crewRef, batchId);
    }
    sendPendingCancels();
  }

  /** Records that Crew must be asked to cancel a session. A session that is already pending keeps its entry. */
  function requestCancel(crewRef: string, batchId: string | null): void {
    if (!pendingCancels.has(crewRef)) pendingCancels.set(crewRef, { batchId, sending: false });
  }

  /** Sends each cancel that is not outstanding. Every call runs in the background, so the pump never waits on Crew. */
  function sendPendingCancels(): void {
    for (const [crewRef, pending] of pendingCancels) {
      if (pending.sending) continue;
      pending.sending = true;
      settleCancel(crewRef, pending).catch(() => undefined);
    }
  }

  /** One cancel call. Accepted: the batch's slot is released. Refused: the entry stays for the next pump. */
  async function settleCancel(crewRef: string, pending: PendingCancel): Promise<void> {
    try {
      await crew.cancel(crewRef);
    } catch {
      pending.sending = false;
      return;
    }
    pendingCancels.delete(crewRef);
    if (pending.batchId !== null) await endSession(pending.batchId);
  }

  async function retryParked(): Promise<void> {
    for (const [taskId, result] of [...parked]) {
      const outcome = await coordinator.commitResult(taskId, result);
      if (outcome.status !== "waiting") parked.delete(taskId);
    }
  }

  async function pump(): Promise<number> {
    await coordinator.sweep();
    await reapIdle();
    await retryParked();
    let started = 0;
    let batch = await coordinator.takeBatch();
    while (batch !== null) {
      started += 1;
      trackRun(runSession(batch));
      batch = await coordinator.takeBatch();
    }
    return started;
  }

  async function cancelEvent(key: EventKey): Promise<void> {
    await coordinator.cancelEvent(key);
    await reapIdle();
  }

  async function drain(): Promise<void> {
    while (running.size > 0) {
      await Promise.all([...running]);
    }
  }

  return { pump, cancelEvent, drain };
}
