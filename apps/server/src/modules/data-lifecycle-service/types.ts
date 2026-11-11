import type { AuditLogPort, DataRequestPort, SubjectCacheHub, SubjectReadPort } from "@voxward/contracts";

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

/** Everything the module needs from its binding. Each port is one short transaction, implemented by the database layer. */
export interface DataDeps {
  readonly requests: DataRequestPort;
  readonly subjects: SubjectReadPort;
  readonly logs: Pick<AuditLogPort, "locateSubjectLogs" | "insertChangeLog">;
  /** In-process surfaces that a deletion must forget (S019, design §5). The binding lists the ones it holds. */
  readonly caches: SubjectCacheHub;
  /** Identifier source. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
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
