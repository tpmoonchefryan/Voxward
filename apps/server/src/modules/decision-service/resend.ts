import { CONTRACT_VERSION, type ResendOutcome, type ResendRequest } from "@voxward/contracts";
import { mayDecide } from "./concurrency.js";
import type { DecisionDeps } from "./service.js";

/**
 * Sends an expired delivery again. It is a separate, explicit action. Only an expired delivery whose verdict is still
 * current, whose subject has not been regenerated, and whose message is young enough can be resent. The new delivery
 * gets its own short validity window.
 */
export function resendDelivery(deps: DecisionDeps, request: ResendRequest): ResendOutcome {
  const delivery = deps.store.readDelivery(request.deliveryId);
  if (delivery === undefined) return { status: "refused", reason: "NOT_FOUND" };
  if (!mayDecide(request.actor, delivery.channelId)) return { status: "denied", reason: "PERMISSION_DENIED" };

  const now = deps.now();
  const nowMs = now.getTime();
  if (Date.parse(delivery.validUntil) > nowMs) return { status: "refused", reason: "NOT_EXPIRED" };
  if (nowMs - Date.parse(delivery.receivedAt) > deps.limits.resendMaxAgeMs) {
    return { status: "refused", reason: "WINDOW_CLOSED" };
  }

  const result = deps.store.commitResend({
    deliveryId: request.deliveryId,
    operationId: request.operationId,
    actorRef: request.actor.accountRef,
    decidedAt: now.toISOString(),
    validUntil: new Date(nowMs + deps.limits.resendValidityMs).toISOString(),
  });

  switch (result.status) {
    case "resent":
      return {
        status: "resent",
        intent: {
          contractVersion: CONTRACT_VERSION,
          eventRef: result.eventRef,
          verdict: result.downstream,
          platformOrder: result.platformOrder,
          deliverySequence: result.deliverySequence,
          validUntil: result.validUntil,
        },
      };
    case "duplicate":
      return { status: "duplicate", deliveryId: result.deliveryId };
    case "refused":
      return { status: "refused", reason: result.reason };
  }
}
