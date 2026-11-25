/**
 * Audit storage as the audit module sees it. The module never imports the database. A server binding implements
 * this port with one short synchronous transaction per call. Values match the CHECK constraints in the database.
 */

export const ACTOR_KINDS = ["ACCOUNT", "SYSTEM", "DEPLOYMENT_ADMIN"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const CHANGE_KINDS = [
  "CONFIG_CHANGED",
  "MEMBER_GRANTED",
  "MEMBER_REVOKED",
  "CREDENTIAL_CHANGED",
  "OUTPUT_GRANT_CHANGED",
  "LIST_CHANGED",
  "TERM_CHANGED",
  "RULE_VERSION_PUBLISHED",
  "MANUAL_VERDICT",
  "SCORE_CHANGED",
  "SCORE_EXCEPTION_CHANGED",
  "DATA_REQUEST_CHANGED",
] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const CHANGE_OUTCOMES = ["SUCCEEDED", "FAILED", "PARTIAL"] as const;
export type ChangeOutcome = (typeof CHANGE_OUTCOMES)[number];

/** Structured templates for localized Change Log rendering without storing user content or reverse-parsing display text. */
export const CHANGE_SUMMARY_CODES = [
  "MANUAL_VERDICT_DECIDED",
  "MANUAL_VERDICT_OVERTURNED",
  "MANUAL_RESEND_QUEUED",
  "SCORE_ADJUSTED",
  "LIST_ENTRY_ADDED",
  "LIST_ENTRY_REMOVED",
  "TERM_CANDIDATE_CONFIRMED",
  "TERM_LIST_PUBLISHED",
  "TERM_ADDED",
  "TERM_DISABLED",
  "DATA_REQUEST_REGISTERED",
  "DATA_REQUEST_VERIFIED",
  "DATA_REQUEST_DELETION_STARTED",
  "DATA_REQUEST_DELETION_FINISHED",
  "CONTROLLED_MATERIAL_GENERATED",
  "SCORE_EXCEPTION_ENROLLED",
  "SCORE_EXCEPTION_RESUMED",
  "DATA_REQUEST_CERTIFICATE",
  "SANDBOX_RESET",
  "SANDBOX_EVENT_PROCESSED",
  "SANDBOX_PRIVACY_REQUEST",
] as const;
export type ChangeSummaryCode = (typeof CHANGE_SUMMARY_CODES)[number];

export type ChangeSummaryParamValue = string | number | boolean | null;
export type ChangeSummaryParams = Readonly<Record<string, ChangeSummaryParamValue>>;

/** Upper bound on serialized Change Log structured summary params, in UTF-8 bytes. */
export const CHANGE_SUMMARY_PARAMS_MAX_BYTES = 1000;

export const TECHNICAL_STAGES = [
  "INGEST",
  "BASE_RULE",
  "ROUTE",
  "MODEL_CALL",
  "JSON_VALIDATE",
  "COMMIT",
  "DELIVER",
  "ERROR",
] as const;
export type TechnicalStage = (typeof TECHNICAL_STAGES)[number];

export const TECHNICAL_STATUSES = ["OK", "FAILED", "SKIPPED", "TIMED_OUT"] as const;
export type TechnicalStatus = (typeof TECHNICAL_STATUSES)[number];

/** Log level. The proposal asks for a level field and does not list values, so these are the implementation's own. */
export const TECHNICAL_LEVELS = ["INFO", "WARN", "ERROR"] as const;
export type TechnicalLevel = (typeof TECHNICAL_LEVELS)[number];

/** The only kinds of controlled content. No transcript, prompt or model-reasoning kind exists. */
export const EVIDENCE_KINDS = ["MESSAGE_TEXT", "TRANSLATION", "ITEM_ID_MAP", "VALIDATED_JSON"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/**
 * Upper bounds on one evidence payload, in UTF-8 bytes. The proposal gives no numbers; these are the
 * implementation's own choices. A payload above its bound is refused, never truncated.
 */
export const EVIDENCE_MAX_BYTES: Readonly<Record<EvidenceKind, number>> = {
  MESSAGE_TEXT: 2048,
  TRANSLATION: 16384,
  ITEM_ID_MAP: 4096,
  VALIDATED_JSON: 8192,
};

/** Change Log summary limit, in Unicode code points (proposal §12.1 and the database CHECK). */
export const CHANGE_SUMMARY_MAX_CHARS = 500;

/** Upper bound on the structured stage data of one Technical Log entry, in UTF-8 bytes. Implementation choice. */
export const TECHNICAL_DATA_MAX_BYTES = 2000;

export type TechnicalDataValue = string | number | boolean | null;
export type TechnicalData = Readonly<Record<string, TechnicalDataValue>>;

/** One Change Log row. It has no field for message text by construction. */
export interface ChangeLogRow {
  readonly id: string;
  readonly channelId: string | null;
  readonly occurredAt: string;
  readonly actorKind: ActorKind;
  readonly actorRef: string;
  readonly changeKind: ChangeKind;
  readonly summary: string;
  readonly summaryCode?: ChangeSummaryCode | null;
  readonly summaryParams?: ChangeSummaryParams | null;
  readonly outcome: ChangeOutcome;
  readonly correlationId: string | null;
  readonly expiresAt: string;
}

/** One Technical Log row before the port assigns its sequence. `id` is the logId. */
export interface TechnicalLogRow {
  readonly id: string;
  readonly channelId: string;
  readonly correlationId: string;
  readonly batchId: string | null;
  readonly taskId: string | null;
  readonly attempt: number | null;
  readonly stage: TechnicalStage;
  readonly status: TechnicalStatus;
  readonly level: TechnicalLevel;
  readonly errorCode: string | null;
  readonly providerRef: string | null;
  readonly modelRef: string | null;
  readonly ruleTemplateVersion: string | null;
  readonly latencyMs: number | null;
  readonly subjectId: string | null;
  readonly data: TechnicalData | null;
  readonly createdAt: string;
  readonly expiresAt: string;
}

/** A Technical Log row as read back. `sequence` is the position inside its correlation chain. */
export interface StoredTechnicalLogRow extends TechnicalLogRow {
  readonly sequence: number;
}

/** One controlled-content row. Its owning log is given by the surrounding call. */
export interface EvidenceRow {
  readonly id: string;
  readonly kind: EvidenceKind;
  readonly payload: string;
  readonly expiresAt: string;
}

/** A stored log row with its evidence rows. */
export interface StoredTechnicalLog {
  readonly log: StoredTechnicalLogRow;
  readonly evidence: readonly EvidenceRow[];
}

/** Everything one subject's deletion touches in the logs. Identifiers only, never content. */
export interface SubjectLogScope {
  readonly logIds: readonly string[];
  readonly correlationIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly changeLogIds: readonly string[];
}

/** Keyset position of a Change Log row. The next page starts after this row in (occurredAt DESC, id DESC) order. */
export interface ChangeLogCursor {
  readonly occurredAt: string;
  readonly id: string;
}

/** Keyset position of a Technical Log row. The next page starts after this row in (createdAt DESC, id DESC) order. */
export interface TechnicalLogCursor {
  readonly createdAt: string;
  readonly id: string;
}

/**
 * One page of Change Log rows. `notExpiredAt` is the reader's current time: rows whose metadata expired at or before
 * it are left out. `correlationId`, when set, keeps only the rows of that processing chain.
 */
export interface ChangeLogPageQuery {
  readonly after: ChangeLogCursor | null;
  readonly correlationId: string | null;
  readonly limit: number;
  readonly notExpiredAt: string;
}

/** One page of Technical Log rows, newest first. `notExpiredAt` works as in {@link ChangeLogPageQuery}. */
export interface TechnicalLogPageQuery {
  readonly after: TechnicalLogCursor | null;
  readonly limit: number;
  readonly notExpiredAt: string;
}

/** One page of a correlation chain in sequence order. `afterSequence` is exclusive; null starts at the first entry. */
export interface ChainPageQuery {
  readonly afterSequence: number | null;
  readonly limit: number;
  readonly notExpiredAt: string;
}

/**
 * Log persistence for the audit module. Every read takes the channel scope as an argument, so a caller cannot
 * read outside the channels it was given.
 */
export interface AuditLogPort {
  /** One short transaction. Writes one Change Log row. */
  insertChangeLog(row: ChangeLogRow): void;
  /**
   * One short transaction. Assigns the next sequence in the (channel, correlation) chain, then writes the log row
   * and its evidence rows. Fails if the subject belongs to another channel.
   */
  insertTechnicalLog(row: TechnicalLogRow, evidence: readonly EvidenceRow[]): { readonly sequence: number };
  /** Read only. Technical Log rows for one correlation id in the given channels, ordered by sequence. */
  readChain(correlationId: string, channelIds: readonly string[]): readonly StoredTechnicalLog[];
  /** Read only. Change Log rows for one correlation id in the given channels. */
  readChangeLogs(correlationId: string, channelIds: readonly string[]): readonly ChangeLogRow[];
  /** Read only. Where one subject's controlled content sits in the logs. */
  locateSubjectLogs(subjectId: string): SubjectLogScope;
  /**
   * One short transaction. Removes the subject's Technical Log rows and their evidence, and replaces the summary of
   * the Change Log rows on the same correlation ids with `certificateSummary`. Other subjects are untouched.
   */
  removeSubjectLogs(subjectId: string, certificateSummary: string): SubjectLogScope;
  /**
   * One short transaction, one evidence kind (S019, SUB-036). Removes that kind of evidence from the subject's technical
   * log rows and returns the scope it found. Other kinds stay until their own step. Other subjects are untouched.
   */
  removeSubjectEvidence(subjectId: string, kind: EvidenceKind): SubjectLogScope;
  /**
   * One short transaction (S019, SUB-036). Removes the subject's technical log rows with any evidence still attached, and
   * returns the scope it found. A row counts when it belongs to the subject or to one of the subject's tasks.
   */
  removeSubjectTechnicalRows(subjectId: string): SubjectLogScope;
  /**
   * One short transaction (S019, SUB-036). Replaces the summary of the subject's Change Log rows with `certificateSummary`
   * and returns the scope it found. A row counts when its correlation id is one of the subject's chains, or when it is on
   * `subject:<subjectId>` (S014 convention). Rows with no technical log are included.
   */
  certifySubjectChangeLogs(subjectId: string, certificateSummary: string): SubjectLogScope;
  /** Read only. One page of Change Log rows of one channel, newest first, optionally of one processing chain. */
  pageChangeLogs(channelId: string, query: ChangeLogPageQuery): readonly ChangeLogRow[];
  /** Read only. One page of Technical Log rows of one channel, newest first. Evidence is not loaded. */
  pageTechnicalLogs(channelId: string, query: TechnicalLogPageQuery): readonly StoredTechnicalLogRow[];
  /** Read only. One Technical Log row with its evidence. Undefined when it is in another channel or has expired. */
  readTechnicalLog(channelId: string, logId: string, notExpiredAt: string): StoredTechnicalLog | undefined;
  /** Read only. One page of a correlation chain in one channel, in sequence order. Evidence is not loaded. */
  pageChain(channelId: string, correlationId: string, query: ChainPageQuery): readonly StoredTechnicalLogRow[];
}
