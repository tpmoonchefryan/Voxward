import { dataRequestChange } from "./change-row.js";
import { FORBIDDEN, conflict, mayHandleData, notFound } from "./requests.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";

/** The controlled material's fields. Each one is named here, so a reviewer can check the list. */
export interface ControlledMaterial {
  readonly materialVersion: "1";
  readonly channelId: string;
  readonly requestId: string;
  readonly subjectRef: string;
  readonly requestKind: string;
  readonly mode: string | null;
  readonly verificationMethod: string | null;
  readonly verifiedAt: string | null;
  readonly executionState: string;
  readonly generatedAt: string;
  readonly retentionCounts: { readonly technicalLogs: number; readonly evidence: number; readonly changeLogs: number };
  readonly notices: readonly string[];
}

/**
 * Generates the controlled material for one verified request. It is a server-side function for an authorized admin
 * tool, not an HTTP route. The material holds identifiers and counts only: no nickname, score history, message text,
 * evidence content, log identifiers or Change Log text. Each generation writes one Change Log row.
 */
export function buildControlledMaterial(deps: DataDeps, actor: DataActor, requestId: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const record = deps.requests.readRequest(actor.channelId, requestId);
  if (record === undefined) return notFound("REQUEST_NOT_FOUND");
  if (record.verificationState !== "VERIFIED") return conflict("REQUEST_NOT_VERIFIED");

  const at = deps.now();
  const scope = deps.logs.locateSubjectLogs(record.subjectId);
  deps.logs.insertChangeLog(
    dataRequestChange(deps, {
      channelId: actor.channelId,
      actorRef: actor.accountId,
      summary: `CONTROLLED_MATERIAL_GENERATED kind=${record.kind} request=${record.id}`,
      summaryCode: "CONTROLLED_MATERIAL_GENERATED",
      summaryParams: { kind: record.kind, requestId: record.id },
      at,
    }),
  );

  const material: ControlledMaterial = {
    materialVersion: "1",
    channelId: record.channelId,
    requestId: record.id,
    subjectRef: record.subjectId,
    requestKind: record.kind,
    mode: record.mode,
    verificationMethod: record.verificationMethod,
    verifiedAt: record.verifiedAt,
    executionState: record.executionState,
    generatedAt: at.toISOString(),
    retentionCounts: {
      technicalLogs: scope.logIds.length,
      evidence: scope.evidenceIds.length,
      changeLogs: scope.changeLogIds.length,
    },
    notices: ["PROVIDER_COPY_NOT_CONTROLLED"],
  };
  return { status: 200, body: { material } };
}
