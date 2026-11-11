import {
  CONTRACT_VERSION,
  type AuditEntry,
  type AuditLogPort,
  type AuditStore,
  type ChangeLogEntry,
  type ChangeLogRow,
  type StoredTechnicalLog,
  type SubjectLogScope,
  type TechnicalLogEntry,
} from "@voxward/contracts";
import { prepareChangeLogRow } from "./change-log.js";
import { assertCorrelationId } from "./correlation.js";
import { RETENTION_DAYS, VIEWER_CAPABILITY, expiryAfter, visiblePayload } from "./content-policy.js";
import { locateSubjectLogContent, removeSubjectLogContent } from "./deletion-index.js";
import type { InvalidationBus } from "./invalidation.js";
import { prepareTechnicalWrite } from "./technical-log.js";
import { requireText } from "./validate.js";

export { AuditInputError } from "./errors.js";
export { assertCorrelationId, newCorrelationId } from "./correlation.js";
export { CERTIFICATE_SUMMARY } from "./deletion-index.js";
export {
  createInvalidationBus,
  type InvalidationBus,
  type InvalidationEvent,
  type InvalidationListener,
  type InvalidationReason,
} from "./invalidation.js";
export { createViewerCache, type ViewerCache } from "./viewer/cache.js";
export { createLogViewer, type LogViewerOptions, type ViewerAccess } from "./viewer/queries.js";

/**
 * Who may read what. The server's membership data (S003) answers these questions, and the module decides what to show.
 * The module never reads membership data itself, because the module zone may only import contracts.
 */
export interface AuditAccess {
  /** Every channel the actor is a member of, with any role. The module narrows this to `logs.view` itself. */
  channelsFor(actorRef: string): readonly string[];
  /** The capabilities the actor holds in one channel. */
  capabilitiesFor(actorRef: string, channelId: string): ReadonlySet<string>;
}

export interface AuditStoreOptions {
  /** Log storage. A server binding supplies the database implementation. */
  readonly port: AuditLogPort;
  /**
   * Credential redaction. Every text field passes through it before it is stored. The composition root passes the
   * server's redactText. This module cannot import it, because the module zone may only import contracts.
   */
  readonly sanitize: (text: string) => string;
  /** Identifier source for logId, evidence ids and change ids. Required: the module cannot import node:crypto. */
  readonly newId: () => string;
  /** Membership facts for the read path. Required for `findByCorrelationId`. */
  readonly access: AuditAccess;
  /** Time source for server-assigned timestamps and for the expiry check on read. Defaults to the system clock. */
  readonly clock?: () => Date;
  /** Receives the invalidation event after a subject's content is deleted. Optional. */
  readonly invalidation?: InvalidationBus;
}

/** The AuditStore contract plus the entry points that have no contract method yet. */
export interface AuditService extends AuditStore {
  /** Writes one Change Log row and returns its id. */
  recordChange(entry: ChangeLogEntry): string;
  /** Writes one Technical Log entry with its evidence and returns its logId and chain sequence. */
  recordTechnical(entry: TechnicalLogEntry): { readonly logId: string; readonly sequence: number };
  /** Where one subject's controlled content sits in the logs. Read only. */
  locateSubject(subjectId: string): SubjectLogScope;
  /** Deletes one subject's controlled content from the logs and publishes the invalidation event. */
  removeSubject(subjectId: string): SubjectLogScope;
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

    async findByCorrelationId(correlationId: string, actorRef: string) {
      assertCorrelationId(correlationId);
      const actor = requireText(actorRef, "actorRef", 128);
      const viewable = options.access
        .channelsFor(actor)
        .filter((channelId) => options.access.capabilitiesFor(actor, channelId).has(VIEWER_CAPABILITY));
      if (viewable.length === 0) return [];

      const now = clock();
      const chain = options.port
        .readChain(correlationId, viewable)
        .map((item) => toTechnicalReadEntry(item, actor, options.access, now));
      const changes = options.port.readChangeLogs(correlationId, viewable).map(toChangeReadEntry);
      return [...chain, ...changes];
    },

    locateSubject(subjectId) {
      return locateSubjectLogContent(options.port, subjectId);
    },

    removeSubject(subjectId) {
      return removeSubjectLogContent(options.port, subjectId, (event) => options.invalidation?.publish(event));
    },
  };
  return service;
}

/** A stored chain entry as the reader sees it. A payload the reader may not see is null; metadata is always shown. */
function toTechnicalReadEntry(
  item: StoredTechnicalLog,
  actor: string,
  access: AuditAccess,
  now: Date,
): TechnicalLogEntry {
  const { log, evidence } = item;
  const capabilities = access.capabilitiesFor(actor, log.channelId);
  return {
    contractVersion: CONTRACT_VERSION,
    kind: "TECHNICAL",
    id: log.id,
    channelId: log.channelId,
    correlationId: log.correlationId,
    occurredAt: log.createdAt,
    sequence: log.sequence,
    stage: log.stage,
    status: log.status,
    level: log.level,
    subjectRef: log.subjectId,
    batchId: log.batchId,
    taskId: log.taskId,
    attempt: log.attempt,
    errorCode: log.errorCode,
    providerRef: log.providerRef,
    modelRef: log.modelRef,
    ruleTemplateVersion: log.ruleTemplateVersion,
    latencyMs: log.latencyMs,
    data: log.data,
    evidence: evidence.map((row) => ({ kind: row.kind, payload: visiblePayload(row, capabilities, now) })),
  };
}

function toChangeReadEntry(row: ChangeLogRow): ChangeLogEntry {
  return {
    contractVersion: CONTRACT_VERSION,
    kind: "CHANGE",
    id: row.id,
    channelId: row.channelId,
    occurredAt: row.occurredAt,
    actor: { kind: row.actorKind, ref: row.actorRef },
    changeKind: row.changeKind,
    outcome: row.outcome,
    summary: row.summary,
    correlationId: row.correlationId,
  };
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
    locateSubject: () => notWired("locateSubject"),
    removeSubject: () => notWired("removeSubject"),
  };
}
