import {
  CONTRACT_VERSION,
  toDownstreamVerdict,
  type OverturnOutcome,
  type OverturnRequest,
} from "@voxward/contracts";
import { mayDecide } from "./concurrency.js";
import type { DecisionDeps } from "./service.js";

/**
 * Reviews the current verdict of one event. The store applies the change only while the verdict and the subject's
 * processing generation are the ones the reviewer saw. A repeated operation identifier returns the earlier result.
 *
 * The score is corrected once, from the ledger's actual change for the event. A new conclusion does not score again (自定).
 */
export function overturnEvent(deps: DecisionDeps, request: OverturnRequest): OverturnOutcome {
  const facts = deps.store.readEvent(request.eventId);
  if (facts === undefined) return { status: "conflict", reason: "EVENT_NOT_FOUND", current: null };
  if (!mayDecide(request.actor, facts.channelId)) return { status: "denied", reason: "PERMISSION_DENIED" };
  if (facts.current === null) return { status: "conflict", reason: "NO_CURRENT_VERDICT", current: null };

  const decidedAt = deps.now();
  const downstream = toDownstreamVerdict(request.verdict.classification);
  // A block is sent at once, so the output can take the old content off. A release is not sent by the review: an
  // explicit resend is the only way to send it (proposal 6.3 and 7.1).
  const deliverable = downstream === "BLOCK";
  const validUntil = new Date(decidedAt.getTime() + deps.limits.overturnValidityMs).toISOString();
  const result = deps.store.commitOverturn({
    eventId: request.eventId,
    operationId: request.operationId,
    expectedVerdictId: facts.current.verdictId,
    expectedGeneration: facts.subjectGeneration,
    verdict: request.verdict,
    actorRef: request.actor.accountRef,
    decidedAt: decidedAt.toISOString(),
    validUntil,
    deliverable,
  });

  switch (result.status) {
    case "overturned":
      return {
        status: "overturned",
        seq: result.seq,
        verdictId: result.verdictId,
        downstream,
        intent: deliverable
          ? {
              contractVersion: CONTRACT_VERSION,
              eventRef: result.eventRef,
              verdict: downstream,
              platformOrder: result.platformOrder,
              deliverySequence: result.deliverySequence,
              validUntil,
            }
          : null,
        compensation: result.compensation,
        compensationDelta: result.compensationDelta,
        needsManualAdjustment: result.needsManualAdjustment,
      };
    case "duplicate":
      return { status: "duplicate", seq: result.seq, verdictId: result.verdictId };
    case "conflict":
      return { status: "conflict", reason: result.reason, current: result.current };
  }
}
