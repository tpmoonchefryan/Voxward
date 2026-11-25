import {
  ACTOR_KINDS,
  CHANGE_KINDS,
  CHANGE_OUTCOMES,
  CHANGE_SUMMARY_CODES,
  CHANGE_SUMMARY_MAX_CHARS,
  CHANGE_SUMMARY_PARAMS_MAX_BYTES,
  type ChangeLogEntry,
  type ChangeLogRow,
  type ChangeSummaryCode,
  type ChangeSummaryParams,
  type ChangeSummaryParamValue,
} from "@voxward/contracts";
import { assertCorrelationId } from "./correlation.js";
import { AuditInputError } from "./errors.js";
import { optionalText, refuseServerField, requireMember, requireText } from "./validate.js";

export interface ChangeWriteContext {
  readonly now: Date;
  readonly expiresAt: string;
  readonly newId: () => string;
  readonly sanitize: (text: string) => string;
}

/**
 * Maps a Change Log entry to its row. The entry type has no message-body field, so a body cannot reach the row.
 * The summary is sanitized first, then counted in code points.
 */
export function prepareChangeLogRow(entry: ChangeLogEntry, context: ChangeWriteContext): ChangeLogRow {
  refuseServerField(entry.id, "id");
  refuseServerField(entry.occurredAt, "occurredAt");
  const channelId = optionalText(entry.channelId, "channelId", 128);
  const changeKind = requireMember(entry.changeKind, CHANGE_KINDS, "changeKind");
  const actorKind = requireMember(entry.actor.kind, ACTOR_KINDS, "actor.kind");
  const actorRef = requireText(context.sanitize(entry.actor.ref), "actor.ref", 128);
  const outcome = requireMember(entry.outcome, CHANGE_OUTCOMES, "outcome");
  const correlationId = entry.correlationId === null ? null : assertCorrelationId(entry.correlationId);
  const summary = requireSummary(context.sanitize(entry.summary));
  const summaryCode = optionalSummaryCode(entry.summaryCode);
  const summaryParams = optionalSummaryParams(entry.summaryParams, context.sanitize);
  return {
    id: context.newId(),
    channelId,
    occurredAt: context.now.toISOString(),
    actorKind,
    actorRef,
    changeKind,
    summary,
    ...(summaryCode !== undefined ? { summaryCode } : {}),
    ...(summaryParams !== undefined ? { summaryParams } : {}),
    outcome,
    correlationId,
    expiresAt: context.expiresAt,
  };
}

function optionalSummaryCode(value: ChangeSummaryCode | null | undefined): ChangeSummaryCode | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireMember(value, CHANGE_SUMMARY_CODES, "summaryCode");
}

function optionalSummaryParams(
  value: ChangeSummaryParams | null | undefined,
  sanitize: (text: string) => string,
): ChangeSummaryParams | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new AuditInputError("summaryParams");
  const sanitized: Record<string, ChangeSummaryParamValue> = {};
  for (const [k, v] of Object.entries(value)) {
    if (k.trim() === "") throw new AuditInputError("summaryParams");
    if (typeof v === "string") {
      sanitized[k] = sanitize(v);
    } else if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new AuditInputError("summaryParams");
      sanitized[k] = v;
    } else if (typeof v === "boolean" || v === null) {
      sanitized[k] = v;
    } else {
      throw new AuditInputError("summaryParams");
    }
  }
  const encoded = JSON.stringify(sanitized);
  if (new TextEncoder().encode(encoded).byteLength > CHANGE_SUMMARY_PARAMS_MAX_BYTES) {
    throw new AuditInputError("summaryParams");
  }
  return sanitized;
}

function requireSummary(text: string): string {
  if (text.trim() === "" || [...text].length > CHANGE_SUMMARY_MAX_CHARS) throw new AuditInputError("summary");
  return text;
}
