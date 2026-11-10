import {
  CONTRACT_VERSION,
  type AuditEntry,
  type AuditLogPort,
  type AuditStore,
  type ChangeLogEntry,
  type TechnicalLogEntry,
} from "@voxward/contracts";
import { RETENTION_DAYS, expiryAfter } from "./content-policy.js";
import { prepareChangeLogRow } from "./change-log.js";
import { prepareTechnicalWrite } from "./technical-log.js";

export { AuditInputError } from "./errors.js";
export { assertCorrelationId, newCorrelationId } from "./correlation.js";

export interface AuditStoreOptions {
  /** Log storage. A server binding supplies the database implementation. */
  readonly port: AuditLogPort;
  /**
   * Credential redaction. Every text field is passed through it before it is stored. The composition root passes
   * the server's redactText. This module cannot import it, because the module zone may only import contracts.
   */
  readonly sanitize: (text: string) => string;
  /** Identifier source for logId, evidence ids and change ids. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
  /** Time source for the server-assigned timestamps. Defaults to the system clock. */
  readonly clock?: () => Date;
}

/** The AuditStore contract plus the two write entry points that have no contract method yet. */
export interface AuditService extends AuditStore {
  /** Writes one Change Log row and returns its id. */
  recordChange(entry: ChangeLogEntry): string;
  /** Writes one Technical Log entry with its evidence and returns its logId and chain sequence. */
  recordTechnical(entry: TechnicalLogEntry): { readonly logId: string; readonly sequence: number };
}

/**
 * Creates the audit module. Without options the module is not wired, and every entry point rejects with the
 * placeholder message the registry has always reported.
 */
export function createAuditStore(options?: AuditStoreOptions): AuditService {
  if (options === undefined) return unwiredAuditService();

  const clock = options.clock ?? (() => new Date());
  const service: AuditService = {
    moduleName: "AuditStore",
    contractVersion: CONTRACT_VERSION,

    recordChange(entry) {
      const now = clock();
      const row = prepareChangeLogRow(entry, {
        now,
        expiresAt: expiryAfter(now, RETENTION_DAYS.metadata),
        newId: options.newId,
        sanitize: options.sanitize,
      });
      options.port.insertChangeLog(row);
      return row.id;
    },

    recordTechnical(entry) {
      const now = clock();
      const prepared = prepareTechnicalWrite(entry, {
        now,
        expiresAt: expiryAfter(now, RETENTION_DAYS.metadata),
        evidenceExpiresAt: expiryAfter(now, RETENTION_DAYS.evidence),
        newId: options.newId,
        sanitize: options.sanitize,
      });
      const { sequence } = options.port.insertTechnicalLog(prepared.row, prepared.evidence);
      return { logId: prepared.row.id, sequence };
    },

    async append(entry: AuditEntry) {
      if (entry.kind === "CHANGE") {
        service.recordChange(entry);
      } else {
        service.recordTechnical(entry);
      }
    },

    // The viewer read needs the content-permission filter. That lands with the field-permission sub-ticket, so until
    // then no caller can read a chain through this module.
    findByCorrelationId: () =>
      Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: AuditStore.findByCorrelationId")),
  };
  return service;
}

function unwiredAuditService(): AuditService {
  const notWired = (name: string) => {
    throw new Error(`MODULE_NOT_IMPLEMENTED: AuditStore.${name}`);
  };
  return {
    moduleName: "AuditStore",
    contractVersion: CONTRACT_VERSION,
    append: () => Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: AuditStore.append")),
    findByCorrelationId: () =>
      Promise.reject(new Error("MODULE_NOT_IMPLEMENTED: AuditStore.findByCorrelationId")),
    recordChange: () => notWired("recordChange"),
    recordTechnical: () => notWired("recordTechnical"),
  };
}
