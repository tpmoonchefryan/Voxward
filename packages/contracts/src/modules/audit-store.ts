import type { Versioned } from "../version.js";
import type { VersionedModule } from "./module-contract.js";

export const AUDIT_LOG_KINDS = ["CHANGE", "TECHNICAL"] as const;
export type AuditLogKind = (typeof AUDIT_LOG_KINDS)[number];

export interface AuditEntry extends Versioned {
  readonly kind: AuditLogKind;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly summary: string;
}

/**
 * Change Log, Technical Log and correlation index.
 * Viewer queries require an actor. The store is not a public or downstream retrieval API.
 */
export interface AuditStore extends VersionedModule<"AuditStore"> {
  append(entry: AuditEntry): Promise<void>;
  findByCorrelationId(correlationId: string, actorRef: string): Promise<readonly AuditEntry[]>;
}
