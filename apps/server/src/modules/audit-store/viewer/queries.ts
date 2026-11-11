import {
  CONTRACT_VERSION,
  type AuditLogPort,
  type ChangeLogRow,
  type LogListQuery,
  type LogViewer,
  type LogViewerChangeItem,
  type LogViewerTechnicalDetail,
  type LogViewerTechnicalItem,
  type StoredTechnicalLog,
  type StoredTechnicalLogRow,
  type ViewerFailureCode,
  type ViewerResult,
} from "@voxward/contracts";
import { VIEWER_CAPABILITY } from "../content-policy.js";
import type { ViewerCache } from "./cache.js";
import { evidenceViewFor } from "./evidence-view.js";
import {
  isOpaqueId,
  pageLimit,
  parseSequenceCursor,
  parseTimeCursor,
  sequenceCursorOf,
  takePage,
  timeCursorOf,
} from "./paging.js";

/** The one part of the access rules the viewer reads. The composition layer answers it from the membership table. */
export interface ViewerAccess {
  capabilitiesFor(actorRef: string, channelId: string): ReadonlySet<string>;
}

export interface LogViewerOptions {
  readonly port: AuditLogPort;
  readonly access: ViewerAccess;
  readonly cache: ViewerCache;
  /** Time source for the expiry checks. Defaults to the system clock. */
  readonly clock?: () => Date;
}

const ok = <T>(value: T): ViewerResult<T> => ({ ok: true, value });
const refused = <T>(code: ViewerFailureCode): ViewerResult<T> => ({ ok: false, code });

/**
 * The internal log viewer. Every method runs the same steps in the same order: the reader's `logs.view` capability in
 * the channel, then the input checks, then the query. Every query carries the channel, so an entry of another channel
 * cannot be reached by id or by correlation id. Content fields are filtered per reader after the read.
 */
export function createLogViewer(options: LogViewerOptions): LogViewer {
  const clock = options.clock ?? (() => new Date());

  return {
    listChanges(actorRef, channelId, query) {
      const capabilities = options.access.capabilitiesFor(actorRef, channelId);
      if (!capabilities.has(VIEWER_CAPABILITY)) return refused("FORBIDDEN");
      const limit = pageLimit(query.limit);
      const after = parseTimeCursor(query.cursor);
      const correlationId = query.correlationId ?? null;
      if (limit === undefined || !after.ok || (correlationId !== null && !isOpaqueId(correlationId))) {
        return refused("INVALID_REQUEST");
      }
      const rows = options.port.pageChangeLogs(channelId, {
        after: after.value === null ? null : { occurredAt: after.value.at, id: after.value.id },
        correlationId,
        limit: limit + 1,
        notExpiredAt: clock().toISOString(),
      });
      return ok(takePage(rows, limit, toChangeItem, (row) => timeCursorOf(row.occurredAt, row.id)));
    },

    listTechnical(actorRef, channelId, query) {
      const capabilities = options.access.capabilitiesFor(actorRef, channelId);
      if (!capabilities.has(VIEWER_CAPABILITY)) return refused("FORBIDDEN");
      const limit = pageLimit(query.limit);
      const after = parseTimeCursor(query.cursor);
      if (limit === undefined || !after.ok) return refused("INVALID_REQUEST");
      const rows = options.port.pageTechnicalLogs(channelId, {
        after: after.value === null ? null : { createdAt: after.value.at, id: after.value.id },
        limit: limit + 1,
        notExpiredAt: clock().toISOString(),
      });
      return ok(takePage(rows, limit, toTechnicalItem, (row) => timeCursorOf(row.createdAt, row.id)));
    },

    readTechnical(actorRef, channelId, logId) {
      const capabilities = options.access.capabilitiesFor(actorRef, channelId);
      if (!capabilities.has(VIEWER_CAPABILITY)) return refused("FORBIDDEN");
      if (!isOpaqueId(logId)) return refused("INVALID_REQUEST");
      const now = clock();
      const stored = options.cache.readDetail(channelId, logId, now) ?? loadDetail(channelId, logId, now);
      if (stored === undefined) return refused("NOT_FOUND");
      return ok(toDetail(stored, capabilities, now));
    },

    readChain(actorRef, channelId, correlationId, query) {
      const capabilities = options.access.capabilitiesFor(actorRef, channelId);
      if (!capabilities.has(VIEWER_CAPABILITY)) return refused("FORBIDDEN");
      const limit = pageLimit(query.limit);
      const after = parseSequenceCursor(query.cursor);
      if (limit === undefined || !after.ok || !isOpaqueId(correlationId)) return refused("INVALID_REQUEST");
      const rows = options.port.pageChain(channelId, correlationId, {
        afterSequence: after.value,
        limit: limit + 1,
        notExpiredAt: clock().toISOString(),
      });
      return ok(takePage(rows, limit, toTechnicalItem, (row) => sequenceCursorOf(row.sequence)));
    },
  };

  /** Reads one entry from storage and caches the raw row. Only an entry that exists is cached. */
  function loadDetail(channelId: string, logId: string, now: Date): StoredTechnicalLog | undefined {
    const stored = options.port.readTechnicalLog(channelId, logId, now.toISOString());
    if (stored !== undefined) options.cache.writeDetail(channelId, stored);
    return stored;
  }
}

function toChangeItem(row: ChangeLogRow): LogViewerChangeItem {
  return {
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

function toTechnicalItem(row: StoredTechnicalLogRow): LogViewerTechnicalItem {
  return {
    id: row.id,
    channelId: row.channelId,
    correlationId: row.correlationId,
    sequence: row.sequence,
    occurredAt: row.createdAt,
    contractVersion: CONTRACT_VERSION,
    stage: row.stage,
    status: row.status,
    level: row.level,
    subjectRef: row.subjectId,
    batchId: row.batchId,
    taskId: row.taskId,
    attempt: row.attempt,
    errorCode: row.errorCode,
    providerRef: row.providerRef,
    modelRef: row.modelRef,
    ruleTemplateVersion: row.ruleTemplateVersion,
    latencyMs: row.latencyMs,
  };
}

function toDetail(stored: StoredTechnicalLog, capabilities: ReadonlySet<string>, now: Date): LogViewerTechnicalDetail {
  return {
    ...toTechnicalItem(stored.log),
    data: stored.log.data,
    evidence: evidenceViewFor(stored.evidence, capabilities, now),
  };
}
