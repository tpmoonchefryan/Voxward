import type { DeletionStart } from "@voxward/contracts";
import { dataRequestChange, exceptionChange } from "./change-row.js";
import { deletionTargets } from "./cleanup-targets.js";
import { preferenceMarkerOf } from "./preference-marker.js";
import { conflict, FORBIDDEN, mayHandleData, notFound, statusView } from "./requests.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";

/**
 * Starts a verified deletion (S019, SUB-035). For DELETE_AND_EXCEPT the scoring exception, the subject's generation and
 * the deletion targets are written in one transaction, inside the database port. Starting again changes nothing: the
 * port reports the request as already started, and the response is the current status.
 */
export function startDeletionRequest(deps: DataDeps, actor: DataActor, requestId: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const record = deps.requests.readRequest(actor.channelId, requestId);
  if (record === undefined) return notFound("REQUEST_NOT_FOUND");
  if (record.kind !== "DELETE") return conflict("NOT_DELETE");
  if (record.verificationState !== "VERIFIED") return conflict("NOT_VERIFIED");
  if (record.mode === null) throw new Error("DELETE request has no mode; the schema should prevent this");

  const at = deps.now();
  const iso = at.toISOString();
  const { mode, subjectId } = record;
  const start: DeletionStart = {
    requestId,
    channelId: actor.channelId,
    subjectId,
    mode,
    at: iso,
    exceptionId: deps.newId(),
    exceptionChange:
      mode === "DELETE_AND_EXCEPT"
        ? exceptionChange(deps, {
            channelId: actor.channelId,
            actorRef: actor.accountId,
            subjectId,
            summary: `记分例外已加入（${preferenceMarkerOf(subjectId, iso).purpose}），请求 ${requestId}`,
            at,
          })
        : null,
    targets: deletionTargets(subjectId, deps.caches.names).map((target) => ({ id: deps.newId(), ...target })),
    startChange: dataRequestChange(deps, {
      channelId: actor.channelId,
      actorRef: actor.accountId,
      summary: `DATA_REQUEST deletion started mode=${mode} request=${requestId}`,
      at,
    }),
  };

  const outcome = deps.requests.startDeletion(start);
  if (outcome.status === "NOT_FOUND") return notFound("REQUEST_NOT_FOUND");
  if (outcome.status === "NOT_ELIGIBLE") return conflict(outcome.reason);
  const latest = deps.requests.readRequest(actor.channelId, requestId);
  if (latest === undefined) return notFound("REQUEST_NOT_FOUND");
  return { status: 200, body: statusView(latest, deps.requests.readItems(requestId)) };
}
