/**
 * Data-request storage and subject reads as the data-lifecycle module sees them. The module never imports the
 * database. A server binding implements these ports, and each write is one short synchronous transaction. Values
 * match the CHECK constraints in the database schema.
 */
import type { ChangeLogRow } from "./audit-log.js";
import type { IdentityKind } from "./scoring-ledger.js";

/**
 * Request kinds. DELETE is proposal §11.2. RESUME_SCORING is the explicit request that lifts a scoring exception
 * (SUB-035, design §5). It is the only path that lifts one.
 */
export const DATA_REQUEST_KINDS = ["ACCESS", "CORRECTION", "DELETE", "STOP_SCORING", "RESUME_SCORING"] as const;
export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number];

/** The two deletion options from proposal §11.2. Only DELETE carries a deletion mode. */
export const DELETE_MODES = ["DELETE_DATA_ONLY", "DELETE_AND_EXCEPT"] as const;
export type DeleteMode = (typeof DELETE_MODES)[number];

export const REQUEST_SOURCES = ["VIEWER_REQUEST", "OPERATOR_INITIATED"] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

export const VERIFICATION_STATES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

/** How a verification was made. Proposal §11.2 names two ways: confirm account ownership, or confirm the request. */
export const VERIFICATION_METHODS = ["ACCOUNT_OWNERSHIP", "REQUEST_AUTHORIZATION"] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const EXECUTION_STATES = ["PENDING", "RUNNING", "COMPLETED", "PARTIAL_FAILED", "CANCELLED"] as const;
export type ExecutionState = (typeof EXECUTION_STATES)[number];

export const DELETION_ITEM_STATES = ["PENDING", "DONE", "FAILED"] as const;
export type DeletionItemState = (typeof DELETION_ITEM_STATES)[number];

/**
 * Storage surfaces a deletion covers, one item each (design §6). The values match the target_kind CHECK in the
 * database schema.
 */
export const DELETION_TARGET_KINDS = [
  "SUBJECT",
  "CHANNEL_EVENT",
  "EVENT_PAYMENT",
  "TASK",
  "VERDICT",
  "DELIVERY",
  "SUBJECT_IDENTITY",
  "SUBJECT_SCORE",
  "SCORE_LEDGER",
  "SCORE_OUTCOME",
  "NICKNAME_CHECK",
  "NICKNAME_CHANGE",
  "LIST_ENTRY",
  "SCORE_EXCEPTION",
  "TECHNICAL_LOG",
  "TECHNICAL_LOG_EVIDENCE",
  "CHANGE_LOG",
  "CANDIDATE_CARD",
  "CACHE",
] as const;
export type DeletionTargetKind = (typeof DELETION_TARGET_KINDS)[number];

/** Why a scoring exception was lifted. Stored as a controlled code; the database has no CHECK on this column. */
export const EXCEPTION_REMOVAL_REASONS = ["RESUME_REQUESTED"] as const;
export type ExceptionRemovalReason = (typeof EXCEPTION_REMOVAL_REASONS)[number];

export const LIST_KINDS = ["BLACKLIST", "WHITELIST"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

/** One request row as read back. `subjectId` is the subject's stable reference inside its channel. */
export interface DataRequestRecord {
  readonly id: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly kind: DataRequestKind;
  readonly mode: DeleteMode | null;
  readonly requestSource: RequestSource;
  readonly verificationState: VerificationState;
  readonly verificationMethod: VerificationMethod | null;
  readonly executionState: ExecutionState;
  readonly createdAt: string;
  readonly verifiedAt: string | null;
  readonly completedAt: string | null;
  readonly updatedAt: string;
  readonly handledByRef: string | null;
}

/** One deletion target of a request. Written by the execution path, read by the status view. */
export interface DataRequestItemRecord {
  readonly id: string;
  readonly requestId: string;
  readonly targetKind: string;
  readonly targetRef: string;
  readonly itemState: DeletionItemState;
  readonly errorCode: string | null;
  readonly attemptedAt: string | null;
  readonly completedAt: string | null;
}

/** The decision the module reached. The port persists it only while the request is still PENDING. */
export interface VerificationUpdate {
  readonly requestId: string;
  readonly channelId: string;
  readonly verificationState: Exclude<VerificationState, "PENDING">;
  readonly verificationMethod: VerificationMethod | null;
  readonly executionState: ExecutionState;
  readonly decidedAt: string;
  readonly handledByRef: string;
}

export type DecisionOutcome = "DECIDED" | "ALREADY_DECIDED" | "NOT_FOUND";

/** One storage surface to register when a deletion starts. `id` is the item row's identifier. */
export interface DeletionTarget {
  readonly id: string;
  readonly targetKind: DeletionTargetKind;
  readonly targetRef: string;
}

/**
 * The start of a deletion, in one transaction (design §5). The port checks the request, creates the scoring-exception
 * marker when the mode asks for it, raises the subject's processing generation, registers every target and writes
 * both Change Log rows. `exceptionChange` is required for DELETE_AND_EXCEPT and written only when the marker is new.
 */
export interface DeletionStart {
  readonly requestId: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly mode: DeleteMode;
  readonly at: string;
  readonly exceptionId: string;
  readonly exceptionChange: ChangeLogRow | null;
  readonly targets: readonly DeletionTarget[];
  readonly startChange: ChangeLogRow;
}

export type DeletionStartOutcome =
  | { readonly status: "STARTED"; readonly generation: number; readonly exceptionCreated: boolean }
  | { readonly status: "ALREADY_STARTED"; readonly executionState: ExecutionState }
  | { readonly status: "NOT_ELIGIBLE"; readonly reason: "NOT_DELETE" | "NOT_VERIFIED" }
  | { readonly status: "NOT_FOUND" };

/** The outcome of one storage surface, written after its cleanup step has run. Carries a code, never content. */
export interface ItemMark {
  readonly requestId: string;
  readonly targetKind: DeletionTargetKind;
  readonly targetRef: string;
  readonly state: Exclude<DeletionItemState, "PENDING">;
  readonly errorCode: string | null;
  readonly at: string;
}

/** The request's execution state once every item has a result. Written with its Change Log row. */
export interface ExecutionFinish {
  readonly requestId: string;
  readonly channelId: string;
  readonly executionState: Extract<ExecutionState, "COMPLETED" | "PARTIAL_FAILED">;
  readonly at: string;
  readonly change: ChangeLogRow;
}

/** An explicit RESUME_SCORING request that lifts the subject's exception. Nothing else lifts one. */
export interface ExceptionResume {
  readonly requestId: string;
  readonly channelId: string;
  readonly subjectId: string;
  readonly at: string;
  readonly change: ChangeLogRow;
}

export type ExceptionResumeOutcome =
  | { readonly status: "RESUMED" }
  | { readonly status: "NO_ACTIVE_EXCEPTION" }
  | { readonly status: "REQUEST_NOT_ELIGIBLE" };

/** Facts about one subject that the panel shows. Read only. Nicknames are not part of it. */
export interface SubjectFacts {
  readonly subjectId: string;
  readonly channelId: string;
  /** Null when the subject has no score row yet. */
  readonly currentScore: number | null;
  /** The latest identity fact. Null when none is recorded. */
  readonly identity: { readonly kind: IdentityKind; readonly effectiveFrom: string } | null;
  /** The active list entry, or null. */
  readonly list: ListKind | null;
  /** The active scoring-exception marker, or null. */
  readonly exception: { readonly createdAt: string } | null;
  readonly ledgerEntryCount: number;
}

export interface DataRequestPort {
  /** One short transaction. Writes the request row and its Change Log row together. */
  insertRequest(record: DataRequestRecord, change: ChangeLogRow): void;
  /**
   * One short transaction. Applies the decision only while the verification state is PENDING, then writes the
   * Change Log row. A request that is already decided, or that is not in the channel, changes nothing.
   */
  decideVerification(update: VerificationUpdate, change: ChangeLogRow): DecisionOutcome;
  /** One short transaction. Starts a deletion: exception, generation, targets and Change Log rows (design §5). */
  startDeletion(start: DeletionStart): DeletionStartOutcome;
  /** One short transaction. Records the result of one storage surface. */
  markItem(mark: ItemMark): void;
  /** One short transaction. Sets the execution state of a deletion and writes its Change Log row. */
  finishExecution(finish: ExecutionFinish): void;
  /**
   * One short transaction. Lifts the subject's active exception, only for a verified RESUME_SCORING request of the same
   * subject. Any other caller leaves the exception in place.
   */
  resumeException(resume: ExceptionResume): ExceptionResumeOutcome;
  /** Read only. Undefined when the request does not belong to the channel. */
  readRequest(channelId: string, requestId: string): DataRequestRecord | undefined;
  /** Read only. Requests of one subject, newest first. */
  listRequests(channelId: string, subjectId: string): readonly DataRequestRecord[];
  /** Read only. Deletion targets of one request. */
  readItems(requestId: string): readonly DataRequestItemRecord[];
}

export interface SubjectReadPort {
  /** Read only. Undefined when the subject does not belong to the channel. */
  readSubject(channelId: string, subjectId: string): SubjectFacts | undefined;
}

/**
 * In-process surfaces that hold subject data outside the database (design §5 and §6). `names` lists the surfaces this
 * process holds. A deletion registers one item per name: CANDIDATE_CARD for `CANDIDATE_CARD`, CACHE for the others.
 * `forgetSubject` drops the subject's entries in that surface and returns how many it dropped.
 */
export interface SubjectCacheHub {
  readonly names: readonly string[];
  forgetSubject(name: string, channelId: string, platformSubjectKey: string, correlationIds: readonly string[]): number;
}


/**
 * Identifiers that the in-process surfaces need, read before a cleanup run (S019, SUB-036). No content and no score.
 * `correlationIds` gathers the chains of the subject's events and technical log rows, sorted and without repeats.
 */
export interface CleanupFacts {
  readonly platformSubjectKey: string;
  readonly correlationIds: readonly string[];
}

/** One database surface to clean. `at` is the server time that the reset writes into the row. */
export interface CleanSurfaceInput {
  readonly channelId: string;
  readonly subjectId: string;
  readonly targetKind: DeletionTargetKind;
  readonly at: string;
}

/**
 * Cleaning of the database surfaces of one subject (design §6). Each call is one short transaction and is idempotent:
 * a surface that is already clean changes nothing. The log surfaces are cleaned through AuditLogPort instead.
 */
export interface SubjectCleanupPort {
  /** Read only. Undefined when the subject does not belong to the channel. */
  readCleanupFacts(channelId: string, subjectId: string): CleanupFacts | undefined;
  /** Removes rows of one surface, or resets them. Returns how many rows it removed or reset. */
  cleanSurface(input: CleanSurfaceInput): number;
}
