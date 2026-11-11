/**
 * Local block and platform removal of one message (proposal 7.3). The local block goes first, through the decision
 * service, so a platform failure never undoes it. The platform status is returned and recorded apart from the local
 * block.
 *
 * Order: local block, then for each request a permission check and one removal. An unknown answer is read back before
 * any retry, and the number of requests is capped.
 */
import {
  createVerdict,
  type DecisionActor,
  type DecisionService,
  type DecisionStorePort,
  type OverturnConflictReason,
  type OverturnOutcome,
  type PlatformDeletePort,
  type PlatformDeleteReason,
  type PlatformDeleteRecord,
  type PlatformDeleteStatus,
} from "@voxward/contracts";

/**
 * Removal requests one operation may send, the first included (自定). A retry follows only a read-back that shows the
 * message still present.
 */
export const PLATFORM_DELETE_MAX_ATTEMPTS = 2;

export interface PlatformDeleteDeps {
  readonly decisions: DecisionService;
  readonly store: Pick<DecisionStorePort, "readEvent">;
  readonly platform: PlatformDeletePort;
  /** Receives each platform status in order: PENDING before a request, then the final status. */
  readonly record: (entry: PlatformDeleteRecord) => void;
  readonly maxAttempts?: number;
}

export interface PlatformDeleteRequest {
  readonly eventId: string;
  readonly operationId: string;
  readonly actor: DecisionActor;
}

/** What the local block did. Only `blocked` and `already_blocked` let the platform step run. */
export type LocalBlockOutcome =
  | { readonly status: "blocked"; readonly seq: number; readonly verdictId: string }
  | { readonly status: "already_blocked"; readonly seq: number }
  | { readonly status: "duplicate"; readonly seq: number; readonly verdictId: string }
  | { readonly status: "denied" }
  | { readonly status: "conflict"; readonly reason: OverturnConflictReason };

export interface PlatformDeleteOutcome {
  readonly local: LocalBlockOutcome;
  /** Null when there is no platform status: the local block did not apply, or the operation repeats an earlier one. */
  readonly platform: PlatformDeleteRecord | null;
}

interface PlatformTarget {
  readonly operationId: string;
  readonly eventId: string;
  readonly channelId: string;
  readonly platformMessageId: string;
}

export async function deleteFromPlatform(
  deps: PlatformDeleteDeps,
  request: PlatformDeleteRequest,
): Promise<PlatformDeleteOutcome> {
  const review = await deps.decisions.overturn({
    eventId: request.eventId,
    operationId: request.operationId,
    verdict: createVerdict("BLOCK"),
    actor: request.actor,
  });
  const local = localBlockOf(review);
  if (local.status !== "blocked" && local.status !== "already_blocked") return { local, platform: null };

  // The review succeeded, so the event exists. A missing event here means the store disagrees with itself: fail loudly.
  const event = deps.store.readEvent(request.eventId);
  if (event === undefined) throw new Error(`EVENT_FACTS_MISSING: ${request.eventId}`);
  const platform = await settle(deps, {
    operationId: request.operationId,
    eventId: request.eventId,
    channelId: event.channelId,
    platformMessageId: event.platformMessageRef,
  });
  return { local, platform };
}

function localBlockOf(outcome: OverturnOutcome): LocalBlockOutcome {
  switch (outcome.status) {
    case "overturned":
      return { status: "blocked", seq: outcome.seq, verdictId: outcome.verdictId };
    case "duplicate":
      return { status: "duplicate", seq: outcome.seq, verdictId: outcome.verdictId };
    case "denied":
      return { status: "denied" };
    case "conflict": {
      // The current verdict is already a block, so the local block is in effect. The platform step still runs (自定).
      const current = outcome.current;
      if (outcome.reason === "SAME_VERDICT" && current !== null && current.downstream === "BLOCK") {
        return { status: "already_blocked", seq: current.seq };
      }
      return { status: "conflict", reason: outcome.reason };
    }
  }
}

async function settle(deps: PlatformDeleteDeps, target: PlatformTarget): Promise<PlatformDeleteRecord> {
  const maxAttempts = deps.maxAttempts ?? PLATFORM_DELETE_MAX_ATTEMPTS;
  let attempts = 0;
  let unitsSpent = 0;
  for (;;) {
    // Checked before every request, because quota or the grant can change between two requests.
    const permission = deps.platform.checkDeletePermission(target.channelId);
    if (!permission.ok) return finish(deps, target, "FAILED", permission.reason, attempts, unitsSpent);

    attempts += 1;
    deps.record(entryOf(target, "PENDING", null, attempts, unitsSpent));
    const response = await deps.platform.deleteMessage(target.channelId, target.platformMessageId);
    unitsSpent += response.unitsSpent;

    const { answer } = response;
    if (answer.kind === "SUCCEEDED") return finish(deps, target, "SUCCEEDED", null, attempts, unitsSpent);
    if (answer.kind === "REJECTED") return finish(deps, target, "FAILED", answer.reason, attempts, unitsSpent);

    // UNKNOWN: the request may or may not have removed the message. A read-back decides, and no request is
    // repeated blindly.
    const presence = await deps.platform.readBack(target.channelId, target.platformMessageId);
    if (presence === "ABSENT") return finish(deps, target, "SUCCEEDED", "VERIFIED_BY_READBACK", attempts, unitsSpent);
    if (presence === "UNVERIFIABLE") {
      return finish(deps, target, "UNKNOWN", "VERIFICATION_UNAVAILABLE", attempts, unitsSpent);
    }
    // PRESENT: the removal did not apply, so another request is safe while the cap allows it.
    if (attempts >= maxAttempts) return finish(deps, target, "FAILED", "RETRY_LIMIT_REACHED", attempts, unitsSpent);
  }
}

function finish(
  deps: PlatformDeleteDeps,
  target: PlatformTarget,
  status: PlatformDeleteStatus,
  reason: PlatformDeleteReason | null,
  attempts: number,
  unitsSpent: number,
): PlatformDeleteRecord {
  const record = entryOf(target, status, reason, attempts, unitsSpent);
  deps.record(record);
  return record;
}

function entryOf(
  target: PlatformTarget,
  status: PlatformDeleteStatus,
  reason: PlatformDeleteReason | null,
  attempts: number,
  unitsSpent: number,
): PlatformDeleteRecord {
  return {
    operationId: target.operationId,
    eventId: target.eventId,
    channelId: target.channelId,
    status,
    reason,
    attempts,
    unitsSpent,
  };
}
