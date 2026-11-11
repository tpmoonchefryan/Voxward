import type {
  AiBatchInput,
  ChannelEvent,
  EvidenceEntry,
  InternalClassification,
  ScoringEngine,
  TaskRef,
} from "@voxward/contracts";

/**
 * Settlement state of a message, as stored in `channel_events.settlement_state` (docs/data-dictionary.md). A message
 * that the realtime path passed through the fast lane starts as UNSETTLED_FAST_PASS.
 */
export const SETTLEMENT_STATES = ["NONE", "UNSETTLED_FAST_PASS", "SETTLED", "UNSETTLED_EXPIRED"] as const;
export type StoredSettlementState = (typeof SETTLEMENT_STATES)[number];

/**
 * Scoring state of a settled message (自定). PENDING means the verdict is committed and the score is not yet applied;
 * `resumePendingScoring` applies it. The ledger idempotency key keeps a retry from counting twice.
 */
export const SCORING_STATES = ["NOT_REQUIRED", "PENDING", "APPLIED", "REFUSED"] as const;
export type ScoringState = (typeof SCORING_STATES)[number];

/** One message as the review sees it. `event.body` is only meaningful while the evidence has not expired. */
export interface ReviewCandidate {
  /** Internal identifier of the `channel_events` row. */
  readonly eventId: string;
  readonly event: ChannelEvent;
  readonly settlementState: StoredSettlementState;
  /** Review deadline, or null when the message has none. */
  readonly settlementDeadlineAt: string | null;
  /** When the message text stops being retained as evidence. */
  readonly evidenceExpiresAt: string;
  /** The subject is on the scoring-exception list in this channel. */
  readonly exceptionMarked: boolean;
  /** A data deletion for this message or its subject is in progress or done. */
  readonly deletionInProgress: boolean;
  /** A person already decided the message, so a review verdict must not replace it. */
  readonly manuallyDecided: boolean;
}

/** The record a BLOCK settlement writes to the review list (Q27). It holds no message text. */
export interface ReviewRecord {
  readonly id: string;
  readonly channelId: string;
  readonly eventId: string;
  readonly correlationId: string;
  readonly classification: "BLOCK";
  readonly source: "REVIEW_SETTLEMENT";
  readonly createdAt: string;
  readonly humanState: "OPEN";
}

/** A candidate term proposed by a review batch. It only becomes a card; a person must confirm it (SUB-022). */
export interface CandidateProposal {
  readonly channelId: string;
  readonly term: string;
  readonly note: string | null;
  readonly sourceCorrelationId: string;
  readonly sourceTaskId: string;
}

export interface SettlementWrite {
  readonly eventId: string;
  readonly classification: InternalClassification;
  readonly decidedAt: string;
}

/**
 * Result of the compare-and-set inside `commitSettlement`. NOT_ELIGIBLE means the stored state changed after the
 * eligibility check, for example because another writer settled the message first.
 */
export type SettlementCommit = { readonly status: "SETTLED" } | { readonly status: "NOT_ELIGIBLE"; readonly reason: "STATE_CHANGED" };

export interface PendingScoring {
  readonly eventId: string;
  readonly event: ChannelEvent;
  readonly classification: InternalClassification;
}

/**
 * Storage of the review. A server binding implements each method inside one short synchronous transaction. The
 * module never imports the database, so the binding is injected.
 *
 * `commitSettlement` must, in the same transaction, check that the stored state is still UNSETTLED_FAST_PASS, store
 * `SETTLED` and the verdict, and set the scoring state to PENDING. A changed state returns NOT_ELIGIBLE and writes
 * nothing.
 */
export interface ReviewStorePort {
  listOpenCandidates(channelId: string): readonly ReviewCandidate[];
  readCandidate(eventId: string): ReviewCandidate | undefined;
  markExpired(eventId: string): void;
  commitSettlement(write: SettlementWrite): SettlementCommit;
  markScoring(eventId: string, state: ScoringState): void;
  listPendingScoring(): readonly PendingScoring[];
}

/** The model call. The input has one item id and one text per item, and the output still needs validation. */
export interface ReviewModelPort {
  reviewBatch(input: AiBatchInput): Promise<unknown>;
}

/** Human review list. A BLOCK settlement appends one record in the same transaction as the verdict. */
export interface ReviewQueuePort {
  append(record: ReviewRecord): void;
}

export interface CandidateProposalPort {
  propose(proposal: CandidateProposal): void;
}

/** One batch as the coordinator hands it out. Only the fields the review reads are listed. */
export interface ReviewBatchLease {
  readonly batchId: string;
  readonly tasks: readonly {
    readonly taskId: string;
    readonly correlationId: string;
    readonly text: string;
    readonly attempt: number;
  }[];
}

/**
 * The task coordinator's exported entry points that the review uses. The coordinator's own types satisfy this shape,
 * so the module needs no import from the task-coordinator module.
 */
export interface BackgroundCoordinatorPort {
  enqueueInLane(lane: "BACKGROUND", event: ChannelEvent, deadlineAt: string): Promise<TaskRef>;
  /** Takes a batch from the BACKGROUND lane only. Realtime and paid work stays with the Crew executor (VW-R-006). */
  takeBatch(options: { readonly lanes: readonly ["BACKGROUND"] }): Promise<ReviewBatchLease | null>;
  commitResult(
    taskId: string,
    result: { readonly apply: () => void; readonly evidence: readonly EvidenceEntry[] },
  ): Promise<{
    readonly status: "committed" | "waiting" | "discarded" | "failed";
    readonly reason?: string;
    readonly waitingOn?: string;
  }>;
  reportFailure(taskId: string, errorCode: string): Promise<{ readonly status: string }>;
  statusOf(taskId: string): Promise<string>;
  finishBatch(batchId: string): Promise<void>;
}

/** The scoring entry point of the contract. The review settles through the same engine as the realtime path. */
export type ScoringPort = Pick<ScoringEngine, "applyVerdict">;
