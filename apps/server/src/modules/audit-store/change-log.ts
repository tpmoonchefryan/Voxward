import {
  ACTOR_KINDS,
  CHANGE_KINDS,
  CHANGE_OUTCOMES,
  CHANGE_SUMMARY_MAX_CHARS,
  type ChangeLogEntry,
  type ChangeLogRow,
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
  return {
    id: context.newId(),
    channelId,
    occurredAt: context.now.toISOString(),
    actorKind,
    actorRef,
    changeKind,
    summary,
    outcome,
    correlationId,
    expiresAt: context.expiresAt,
  };
}

function requireSummary(text: string): string {
  if (text.trim() === "" || [...text].length > CHANGE_SUMMARY_MAX_CHARS) throw new AuditInputError("summary");
  return text;
}
