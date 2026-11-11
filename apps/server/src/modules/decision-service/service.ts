import {
  CONTRACT_VERSION,
  toDownstreamVerdict,
  type CommitOrigin,
  type CommitOutcome,
  type DecisionStorePort,
  type DeliveryIntent,
  type Verdict,
} from "@voxward/contracts";
import { conflictOutcome, mayDecide } from "./concurrency.js";

export interface DecisionDeps {
  /** Storage port. Each write is one short transaction that checks its guards again. */
  readonly store: DecisionStorePort;
  /** Identifier source for new verdicts and delivery intents. */
  readonly newId: () => string;
  /** Wall clock for decision and delivery times. */
  readonly now: () => Date;
}

/**
 * Settles one task. A human takeover and an AI result go through the same path. The store decides whether the task is
 * still open, so a late AI result after a human decision is refused without a score change.
 */
export function commitDecision(
  deps: DecisionDeps,
  taskId: string,
  verdict: Verdict,
  origin: CommitOrigin,
): CommitOutcome {
  const facts = deps.store.readTask(taskId);
  if (facts === undefined) return conflictOutcome("TASK_NOT_FOUND", null);
  if (origin.kind === "HUMAN" && !mayDecide(origin.actor, facts.channelId)) {
    return { status: "denied", reason: "PERMISSION_DENIED" };
  }

  const isHuman = origin.kind === "HUMAN";
  const result = deps.store.commitVerdict({
    taskId,
    verdictId: deps.newId(),
    deliveryId: deps.newId(),
    verdict,
    source: isHuman ? "MANUAL" : origin.source,
    decidedAt: deps.now().toISOString(),
    decidedByRef: isHuman ? origin.actor.accountRef : `system:${origin.source}`,
    changeActorRef: isHuman ? origin.actor.accountRef : null,
    // The delivery stays valid until the task's own deadline (自定: the deadline is the validity of a settled verdict).
    validUntil: facts.deadlineAt,
  });
  if (result.status === "conflict") return conflictOutcome(result.reason, result.current);

  const intent: DeliveryIntent = {
    contractVersion: CONTRACT_VERSION,
    eventRef: result.eventRef,
    verdict: toDownstreamVerdict(verdict.classification),
    platformOrder: result.platformOrder,
    deliverySequence: result.deliverySequence,
    validUntil: facts.deadlineAt,
  };
  return {
    status: "committed",
    intent,
    seq: result.seq,
    scoring: result.scoring,
    actualDelta: result.actualDelta,
  };
}
