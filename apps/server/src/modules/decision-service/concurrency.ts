import {
  REVIEW_CAPABILITY,
  type CommitConflictReason,
  type CurrentDecision,
  type DecisionActor,
  type CommitOutcome,
} from "@voxward/contracts";

/** Whether a human may decide in the task's channel. The actor must belong to that channel and hold the capability. */
export function mayDecide(actor: DecisionActor, channelId: string): boolean {
  return actor.channelId === channelId && actor.capabilities.has(REVIEW_CAPABILITY);
}

/** A conflict result. The stored decision is unchanged, and `current` says what it is now. */
export function conflictOutcome(reason: CommitConflictReason, current: CurrentDecision | null): CommitOutcome {
  return { status: "conflict", reason, current };
}
