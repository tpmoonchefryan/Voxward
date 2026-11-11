/**
 * Data-request storage and subject reads as the data-lifecycle module sees them. The module never imports the
 * database. A server binding implements these ports, and each write is one short synchronous transaction. Values
 * match the CHECK constraints in the database schema.
 */
import type { ChangeLogRow } from "./audit-log.js";
import type { IdentityKind } from "./scoring-ledger.js";

/** Request kinds from proposal §11.2. Only DELETE carries a deletion mode. */
export const DATA_REQUEST_KINDS = ["ACCESS", "CORRECTION", "DELETE", "STOP_SCORING"] as const;
export type DataRequestKind = (typeof DATA_REQUEST_KINDS)[number];

/** The two deletion options from proposal §11.2. */
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
