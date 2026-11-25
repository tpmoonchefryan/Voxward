import type { ChangeLogRow, ChangeSummaryCode, ChangeSummaryParams } from "@voxward/contracts";
import type { DataDeps } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface RowInput {
  readonly channelId: string;
  readonly actorRef: string;
  readonly changeKind: "DATA_REQUEST_CHANGED" | "SCORE_EXCEPTION_CHANGED";
  readonly summary: string;
  readonly summaryCode: ChangeSummaryCode;
  readonly summaryParams: ChangeSummaryParams | null;
  readonly correlationId: string | null;
  readonly at: Date;
  /** SUCCEEDED for a complete step, PARTIAL when some storage surfaces failed (S019, SUB-036). */
  readonly outcome?: "SUCCEEDED" | "PARTIAL";
}

/**
 * One Change Log row. The summary is a fixed template built from enumeration values and opaque ids. It never carries
 * user text, nicknames, scores or content, because the row is kept for the metadata period.
 */
function rowOf(deps: DataDeps, input: RowInput): ChangeLogRow {
  return {
    id: deps.newId(),
    channelId: input.channelId,
    occurredAt: input.at.toISOString(),
    actorKind: "ACCOUNT",
    actorRef: input.actorRef,
    changeKind: input.changeKind,
    summary: input.summary,
    summaryCode: input.summaryCode,
    summaryParams: input.summaryParams,
    outcome: input.outcome ?? "SUCCEEDED",
    correlationId: input.correlationId,
    expiresAt: new Date(input.at.getTime() + deps.retentionDays.metadata * DAY_MS).toISOString(),
  };
}

/** A data-request event. It has no correlation, because it is not tied to a message chain. */
export function dataRequestChange(
  deps: DataDeps,
  input: {
    readonly channelId: string;
    readonly actorRef: string;
    readonly summary: string;
    readonly summaryCode: ChangeSummaryCode;
    readonly summaryParams?: ChangeSummaryParams | null;
    readonly at: Date;
    readonly outcome?: "SUCCEEDED" | "PARTIAL";
  },
): ChangeLogRow {
  return rowOf(deps, {
    ...input,
    summaryParams: input.summaryParams ?? null,
    changeKind: "DATA_REQUEST_CHANGED",
    correlationId: null,
  });
}

/**
 * A scoring-exception event. It is a subject-level record, so its correlation is `subject:<subjectId>` (S014 convention).
 * The deletion index finds these rows by that value (S019, Q29).
 */
export function exceptionChange(
  deps: DataDeps,
  input: {
    readonly channelId: string;
    readonly actorRef: string;
    readonly subjectId: string;
    readonly summary: string;
    readonly summaryCode: ChangeSummaryCode;
    readonly summaryParams?: ChangeSummaryParams | null;
    readonly at: Date;
  },
): ChangeLogRow {
  return rowOf(deps, {
    channelId: input.channelId,
    actorRef: input.actorRef,
    changeKind: "SCORE_EXCEPTION_CHANGED",
    summary: input.summary,
    summaryCode: input.summaryCode,
    summaryParams: input.summaryParams ?? null,
    correlationId: `subject:${input.subjectId}`,
    at: input.at,
  });
}
