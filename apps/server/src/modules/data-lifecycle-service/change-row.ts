import type { ChangeLogRow } from "@voxward/contracts";
import type { DataDeps } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One Change Log row for a data-request event. The summary is a fixed template built from enumeration values and
 * opaque ids. It never carries user text, nicknames or content, because the row is kept for the metadata period.
 */
export function dataRequestChange(
  deps: DataDeps,
  input: { readonly channelId: string; readonly actorRef: string; readonly summary: string; readonly at: Date },
): ChangeLogRow {
  return {
    id: deps.newId(),
    channelId: input.channelId,
    occurredAt: input.at.toISOString(),
    actorKind: "ACCOUNT",
    actorRef: input.actorRef,
    changeKind: "DATA_REQUEST_CHANGED",
    summary: input.summary,
    outcome: "SUCCEEDED",
    correlationId: null,
    expiresAt: new Date(input.at.getTime() + deps.retentionDays.metadata * DAY_MS).toISOString(),
  };
}
