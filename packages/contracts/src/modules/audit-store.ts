import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";
import type {
  ActorKind,
  ChangeKind,
  ChangeOutcome,
  ChangeSummaryCode,
  ChangeSummaryParams,
  EvidenceKind,
  TechnicalData,
  TechnicalLevel,
  TechnicalStage,
  TechnicalStatus,
} from "../ports/audit-log.js";

export const AUDIT_LOG_KINDS = ["CHANGE", "TECHNICAL"] as const;
export type AuditLogKind = (typeof AUDIT_LOG_KINDS)[number];

/**
 * Change Log entry. It has no field for message text. `id` and `occurredAt` are assigned by the store: a write that
 * sets them is refused. A read returns them.
 */
export interface ChangeLogEntry extends Versioned {
  readonly kind: "CHANGE";
  readonly id?: string;
  readonly channelId: string | null;
  readonly occurredAt?: string;
  readonly actor: { readonly kind: ActorKind; readonly ref: string };
  readonly changeKind: ChangeKind;
  readonly outcome: ChangeOutcome;
  readonly summary: string;
  readonly summaryCode?: ChangeSummaryCode | null;
  readonly summaryParams?: ChangeSummaryParams | null;
  readonly correlationId: string | null;
}

/** One controlled-content item of a Technical Log entry. */
export interface EvidenceEntry {
  readonly kind: EvidenceKind;
  /** On a write, the content. On a read, null when the reader lacks the permission for this kind. */
  readonly payload: string | null;
}

/**
 * Technical Log entry: one processing step of one message or operation. `id` (logId), `occurredAt` and `sequence`
 * are assigned by the store and returned on a read. A write that sets them is refused.
 */
export interface TechnicalLogEntry extends Versioned {
  readonly kind: "TECHNICAL";
  readonly id?: string;
  readonly channelId: string;
  readonly correlationId: string;
  readonly occurredAt?: string;
  readonly sequence?: number;
  readonly stage: TechnicalStage;
  readonly status: TechnicalStatus;
  readonly level: TechnicalLevel;
  readonly subjectRef: string | null;
  readonly batchId: string | null;
  readonly taskId: string | null;
  readonly attempt: number | null;
  readonly errorCode: string | null;
  readonly providerRef: string | null;
  readonly modelRef: string | null;
  readonly ruleTemplateVersion: string | null;
  readonly latencyMs: number | null;
  readonly data: TechnicalData | null;
  readonly evidence: readonly EvidenceEntry[];
}

export type AuditEntry = ChangeLogEntry | TechnicalLogEntry;

/**
 * Change Log, Technical Log and correlation index.
 * Viewer queries require an actor. The store is not a public or downstream retrieval API.
 */
export interface AuditStore extends VersionedModule<"AuditStore"> {
  append(entry: AuditEntry): Promise<void>;
  findByCorrelationId(correlationId: string, actorRef: string): Promise<readonly AuditEntry[]>;
}
