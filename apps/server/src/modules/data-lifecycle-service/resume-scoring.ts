import { exceptionChange } from "./change-row.js";
import { conflict, FORBIDDEN, mayHandleData, notFound } from "./requests.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";

/**
 * Lifts a subject's scoring exception on an explicit request (S019, proposal §11.4). The port accepts only a verified
 * RESUME_SCORING request of the same subject. Roster sync, reconnects and manual score changes never reach this path,
 * so they cannot lift the exception.
 */
export function resumeScoring(deps: DataDeps, actor: DataActor, subjectRef: string, requestId: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  if (deps.subjects.readSubject(actor.channelId, subjectRef) === undefined) return notFound("SUBJECT_NOT_FOUND");

  const at = deps.now();
  const outcome = deps.requests.resumeException({
    requestId,
    channelId: actor.channelId,
    subjectId: subjectRef,
    at: at.toISOString(),
    change: exceptionChange(deps, {
      channelId: actor.channelId,
      actorRef: actor.accountId,
      subjectId: subjectRef,
      summary: `记分例外已恢复计分，请求 ${requestId}`,
      at,
    }),
  });
  if (outcome.status === "REQUEST_NOT_ELIGIBLE") return conflict("REQUEST_NOT_ELIGIBLE");
  return { status: 200, body: { outcome: outcome.status } };
}
