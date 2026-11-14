import type { AuditLogPort, DataRequestPort, SubjectCacheHub, SubjectCleanupPort, SubjectReadPort } from "@voxward/contracts";

/** The capability that every data-panel route needs. S003 grants it to DATA_ADMIN only (design section 4.1). */
export const DATA_HANDLE_CAPABILITY = "data.handle";

/**
 * The caller, already authenticated by the HTTP binding. `capabilities` is the capability set of the caller's
 * membership in `channelId`. The module never reads membership data itself, because it may import only contracts.
 */
export interface DataActor {
  readonly accountId: string;
  readonly channelId: string;
  readonly capabilities: ReadonlySet<string>;
}

/**
 * Identifiers of log rows that a deletion removed or certified. It has the shape of the audit module's invalidation
 * event, so the bound bus accepts it. It carries no content and no subject id.
 */
export interface DeletedLogsEvent {
  readonly reason: "DELETED";
  readonly logIds: readonly string[];
  readonly correlationIds: readonly string[];
  readonly changeLogIds: readonly string[];
}

/** One record of the tombstone ledger (S020). It holds ids and a mode, never content. */
export interface TombstoneRecord {
  readonly kind: "DELETE" | "DONE" | "RESUME";
  readonly requestId: string;
  readonly channelId: string;
  readonly subjectId: string;
  /** Set for DELETE only. */
  readonly mode?: "DELETE_DATA_ONLY" | "DELETE_AND_EXCEPT";
  readonly at: string;
}

/** Persists tombstones outside the database, so a restored snapshot cannot roll them back. Throws when it cannot persist. */
export interface TombstonePort {
  record(entry: TombstoneRecord): void;
}

/** Everything the module needs from its binding. Each port is one short transaction, implemented by the database layer. */
export interface DataDeps {
  readonly requests: DataRequestPort;
  readonly subjects: SubjectReadPort;
  readonly logs: Pick<
    AuditLogPort,
    | "locateSubjectLogs"
    | "insertChangeLog"
    | "removeSubjectEvidence"
    | "removeSubjectTechnicalRows"
    | "certifySubjectChangeLogs"
  >;
  /** Database storage surfaces of one subject, cleaned one at a time (S019, SUB-036). */
  readonly cleanup: SubjectCleanupPort;
  /** In-process surfaces that a deletion must forget (S019, design §5). The binding lists the ones it holds. */
  readonly caches: SubjectCacheHub;
  /** Publishes the log rows a deletion touched on the bus that the viewer cache listens to (Q35). */
  readonly publishInvalidation: (event: DeletedLogsEvent) => void;
  /** The text that replaces the summary of a deleted chain's Change Log rows (the audit module's certificate). */
  readonly certificateSummary: string;
  /** Identifier source. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
  /** The ledger that restore replays (S020). Absent means no restore protection is wired, and deletions run as before. */
  readonly tombstones?: TombstonePort;
  /** Server clock. Every timestamp the module writes comes from here. */
  readonly now: () => Date;
  /** Retention in days, from the audit module's table. Passed in because the module cannot import that module. */
  readonly retentionDays: { readonly metadata: number; readonly evidence: number };
}

/** One framework-agnostic response. The HTTP binding writes it out unchanged. */
export interface RouteResponse {
  readonly status: 200 | 201 | 400 | 403 | 404 | 409;
  readonly body: unknown;
}
