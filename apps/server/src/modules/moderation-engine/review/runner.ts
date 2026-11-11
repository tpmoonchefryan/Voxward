import {
  type AiBatchInput,
  type ChannelEvent,
  type EvidenceEntry,
  type InternalClassification,
  type ReviewItemResult,
  validateReviewBatchResult,
} from "@voxward/contracts";
import { createTaskAliasTable } from "./author-alias.js";
import type {
  BackgroundCoordinatorPort,
  CandidateProposalPort,
  ReviewBatchLease,
  ReviewModelPort,
  ReviewQueuePort,
  ReviewStorePort,
  ScoringPort,
  ScoringState,
} from "./ports.js";
import { eligibilityOf, type IneligibleReason, type SelectionSkip, selectForReview } from "./selection.js";
import { isScoringRefusal, proposalsOf, reviewRecordOf, verdictOf } from "./settlement.js";
import { decideReviewTrigger, type ReviewPolicy, type ReviewTrigger, resolveReviewPolicy } from "./triggers.js";

export interface ReviewRunnerDeps {
  readonly store: ReviewStorePort;
  readonly coordinator: BackgroundCoordinatorPort;
  readonly model: ReviewModelPort;
  readonly scoring: ScoringPort;
  readonly reviewQueue: ReviewQueuePort;
  readonly candidates: CandidateProposalPort;
  readonly now: () => Date;
  /** Identifier source for review records. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
  /** Nonce for the author aliases of one task. Each task asks for a new one. */
  readonly newNonce: () => string;
  readonly policy?: Partial<ReviewPolicy>;
}

export interface CycleOutcome {
  readonly trigger: ReviewTrigger | null;
  readonly enqueued: number;
  readonly expired: number;
  readonly skipped: readonly SelectionSkip[];
}

export type ItemOutcome =
  | {
      readonly status: "SETTLED";
      readonly taskId: string;
      readonly eventId: string;
      readonly classification: InternalClassification;
      readonly scoring: ScoringState;
    }
  | { readonly status: "NOT_ELIGIBLE"; readonly taskId: string; readonly eventId: string; readonly reason: IneligibleReason | "STATE_CHANGED" }
  | { readonly status: "DEFERRED"; readonly taskId: string; readonly eventId: string; readonly waitingOn: string | null }
  | { readonly status: "DISCARDED"; readonly taskId: string; readonly eventId: string; readonly reason: string }
  | { readonly status: "FAILED"; readonly taskId: string; readonly eventId: string | null; readonly errorCode: string };

export interface BatchOutcome {
  readonly batchId: string;
  readonly items: readonly ItemOutcome[];
}

export interface ReviewRunner {
  /** Checks the triggers for one channel and, when one fires, enqueues the selected messages in the BACKGROUND lane. */
  runCycle(input: { readonly channelId: string; readonly streamEnded: boolean }): Promise<CycleOutcome>;
  /** Takes one batch from the coordinator, reviews it, and settles each item. Null when no batch is ready. */
  runBatch(): Promise<BatchOutcome | null>;
  /** Applies the score of settled items whose scoring is still pending. Returns how many were attempted. */
  resumePendingScoring(): Promise<number>;
}

interface TaskEntry {
  readonly eventId: string;
  readonly event: ChannelEvent;
}

interface KnownTask {
  readonly taskId: string;
  readonly text: string;
  readonly itemId: string;
  readonly entry: TaskEntry;
}

type ModelReview = { readonly ok: true; readonly byItemId: ReadonlyMap<string, ReviewItemResult> } | { readonly ok: false; readonly errorCode: string };

/** What the commit closure records. Object fields keep the outcome readable after the closure has run. */
interface SettleState {
  reason: IneligibleReason | "STATE_CHANGED" | null;
}

/**
 * Builds the review runner. Each settlement is decided by the same eligibility rule the selection uses, checked again
 * inside the coordinator's commit, so a message that was settled, decided by a person, deleted or expired in the
 * meantime is not settled a second time. The score is applied only after a successful commit.
 */
export function createReviewRunner(deps: ReviewRunnerDeps): ReviewRunner {
  const policy = resolveReviewPolicy(deps.policy);
  const lastCycleMs = new Map<string, number>();
  const entries = new Map<string, TaskEntry>();

  async function runCycle({ channelId, streamEnded }: { readonly channelId: string; readonly streamEnded: boolean }): Promise<CycleOutcome> {
    const nowMs = deps.now().getTime();
    const nowIso = new Date(nowMs).toISOString();
    const open = deps.store.listOpenCandidates(channelId);
    const trigger = decideReviewTrigger(
      { nowMs, lastCycleMs: lastCycleMs.get(channelId) ?? null, openCount: open.length, streamEnded },
      policy,
    );
    if (trigger === null) return { trigger, enqueued: 0, expired: 0, skipped: [] };
    lastCycleMs.set(channelId, nowMs);

    const selection = selectForReview(open, nowIso, policy.maxPerCycle);
    for (const candidate of selection.expired) deps.store.markExpired(candidate.eventId);
    for (const candidate of selection.selected) {
      const deadlineAt = candidate.settlementDeadlineAt ?? candidate.evidenceExpiresAt;
      const ref = await deps.coordinator.enqueueInLane("BACKGROUND", candidate.event, deadlineAt);
      // The coordinator returns the existing task for an event it already holds. Only a task still waiting or running is
      // worked here, so a finished one does not keep an entry.
      const status = await deps.coordinator.statusOf(ref.taskId);
      if (status === "QUEUED" || status === "RUNNING") entries.set(ref.taskId, { eventId: candidate.eventId, event: candidate.event });
    }
    return {
      trigger,
      enqueued: selection.selected.length,
      expired: selection.expired.length,
      skipped: selection.skipped,
    };
  }

  async function runBatch(): Promise<BatchOutcome | null> {
    const batch: ReviewBatchLease | null = await deps.coordinator.takeBatch();
    if (batch === null) return null;

    const items: ItemOutcome[] = [];
    const known: KnownTask[] = [];
    for (const task of batch.tasks) {
      const entry = entries.get(task.taskId);
      if (entry === undefined) {
        items.push(await failTask(task.taskId, null, "REVIEW_TASK_UNKNOWN"));
        continue;
      }
      known.push({ taskId: task.taskId, text: task.text, itemId: `i${known.length}`, entry });
    }

    if (known.length > 0) {
      const review = await reviewWithModel(known);
      for (const task of known) {
        if (!review.ok) {
          items.push(await failTask(task.taskId, task.entry.eventId, review.errorCode));
          continue;
        }
        const item = review.byItemId.get(task.itemId);
        if (item === undefined) {
          items.push(await failTask(task.taskId, task.entry.eventId, "AI_OUTPUT_INCOMPLETE"));
          continue;
        }
        const outcome = await settle(task, item);
        if (outcome.status === "SETTLED" || outcome.status === "NOT_ELIGIBLE" || outcome.status === "DISCARDED") {
          entries.delete(task.taskId);
        }
        items.push(outcome);
      }
    }

    await deps.coordinator.finishBatch(batch.batchId);
    return { batchId: batch.batchId, items };
  }

  /** One model call for the batch. The author alias is the only identity the model sees, and only inside the text. */
  async function reviewWithModel(known: readonly KnownTask[]): Promise<ModelReview> {
    const aliases = createTaskAliasTable(deps.newNonce());
    const input: AiBatchInput = {
      items: known.map((task) => ({
        itemId: task.itemId,
        text: `[${aliases.aliasFor(subjectRefOf(task.entry.event))}] ${task.text}`,
      })),
    };
    let raw: unknown;
    try {
      raw = await deps.model.reviewBatch(input);
    } catch {
      return { ok: false, errorCode: "MODEL_CALL_FAILED" };
    }
    const checked = validateReviewBatchResult(raw);
    if (!checked.ok) return { ok: false, errorCode: "AI_OUTPUT_INVALID" };
    return { ok: true, byItemId: new Map(checked.value.items.map((item) => [item.itemId, item])) };
  }

  async function settle(task: KnownTask, item: ReviewItemResult): Promise<ItemOutcome> {
    const { event, eventId } = task.entry;
    const nowIso = deps.now().toISOString();
    const state: SettleState = { reason: null };
    const commit = await deps.coordinator.commitResult(task.taskId, {
      apply: () => {
        const current = deps.store.readCandidate(eventId);
        if (current === undefined) {
          state.reason = "STATE_CHANGED";
          return;
        }
        const ineligible = eligibilityOf(current, nowIso);
        if (ineligible !== null) {
          state.reason = ineligible;
          return;
        }
        const write = deps.store.commitSettlement({ eventId, classification: item.verdict, decidedAt: nowIso });
        if (write.status === "NOT_ELIGIBLE") {
          state.reason = write.reason;
          return;
        }
        if (item.verdict === "BLOCK") {
          deps.reviewQueue.append(
            reviewRecordOf({
              id: deps.newId(),
              channelId: event.channelId,
              eventId,
              correlationId: event.correlationId,
              createdAt: nowIso,
            }),
          );
        }
        const proposals = proposalsOf(item, {
          channelId: event.channelId,
          correlationId: event.correlationId,
          taskId: task.taskId,
        });
        for (const proposal of proposals) deps.candidates.propose(proposal);
      },
      evidence: evidenceOf(item, event.correlationId),
    });

    if (commit.status === "failed") return { status: "FAILED", taskId: task.taskId, eventId, errorCode: "COMMIT_FAILED" };
    if (commit.status === "discarded") {
      return { status: "DISCARDED", taskId: task.taskId, eventId, reason: commit.reason ?? "DISCARDED" };
    }
    if (commit.status === "waiting") {
      // The ordering gate holds the task behind an unfinished predecessor. A retry keeps the task open for a later batch.
      const retry = await deps.coordinator.reportFailure(task.taskId, "PREDECESSOR_PENDING");
      forgetUnlessRetried(task.taskId, retry.status);
      return { status: "DEFERRED", taskId: task.taskId, eventId, waitingOn: commit.waitingOn ?? null };
    }
    if (state.reason !== null) return { status: "NOT_ELIGIBLE", taskId: task.taskId, eventId, reason: state.reason };

    const scoring = await applyScoring(eventId, event, item.verdict);
    return { status: "SETTLED", taskId: task.taskId, eventId, classification: item.verdict, scoring };
  }

  /**
   * Applies the score of one committed verdict. A refusal for an exception subject is recorded, not retried. Any other
   * failure leaves the item PENDING for `resumePendingScoring`. The ledger key makes a repeated call a no-op.
   */
  async function applyScoring(eventId: string, event: ChannelEvent, classification: InternalClassification): Promise<ScoringState> {
    try {
      await deps.scoring.applyVerdict(event, verdictOf(classification));
    } catch (error) {
      if (isScoringRefusal(error)) {
        deps.store.markScoring(eventId, "REFUSED");
        return "REFUSED";
      }
      return "PENDING";
    }
    deps.store.markScoring(eventId, "APPLIED");
    return "APPLIED";
  }

  async function resumePendingScoring(): Promise<number> {
    let attempted = 0;
    for (const pending of deps.store.listPendingScoring()) {
      const current = deps.store.readCandidate(pending.eventId);
      if (current === undefined || current.deletionInProgress) {
        // Deleted data is not scored again, so a late retry cannot bring it back.
        deps.store.markScoring(pending.eventId, "NOT_REQUIRED");
        continue;
      }
      await applyScoring(pending.eventId, pending.event, pending.classification);
      attempted += 1;
    }
    return attempted;
  }

  async function failTask(taskId: string, eventId: string | null, errorCode: string): Promise<ItemOutcome> {
    const retry = await deps.coordinator.reportFailure(taskId, errorCode);
    forgetUnlessRetried(taskId, retry.status);
    return { status: "FAILED", taskId, eventId, errorCode };
  }

  /** A task that goes back to the queue keeps its entry for the retry. Any other outcome ends the entry. */
  function forgetUnlessRetried(taskId: string, status: string): void {
    if (status !== "retry_scheduled") entries.delete(taskId);
  }

  return { runCycle, runBatch, resumePendingScoring };
}

function subjectRefOf(event: ChannelEvent): string {
  return `${event.channelId}/${event.sender.senderRef}`;
}

function evidenceOf(item: ReviewItemResult, correlationId: string): EvidenceEntry[] {
  return [
    { kind: "ITEM_ID_MAP", payload: JSON.stringify({ [item.itemId]: correlationId }) },
    {
      kind: "VALIDATED_JSON",
      payload: JSON.stringify({ itemId: item.itemId, classification: item.verdict, reasonCodes: item.reasonCodes }),
    },
  ];
}
