import type {
  DataRequestItemRecord,
  DataRequestKind,
  DataRequestRecord,
  DeleteMode,
  DeletionItemState,
  ExecutionState,
  RequestSource,
  VerificationMethod,
  VerificationState,
  VerificationUpdate,
} from "@voxward/contracts";
import { dataRequestChange } from "./change-row.js";
import { DATA_HANDLE_CAPABILITY, type DataActor, type DataDeps, type RouteResponse } from "./types.js";
import type { RegisterInput, VerificationInput } from "./validate.js";

/**
 * What the request means for the page. The server returns a code, and the page writes the sentence. The codes follow
 * the states in the S018 design, section 4.2.
 */
export type RequestStage =
  | "AWAITING_VERIFICATION"
  | "REJECTED"
  | "AWAITING_EXECUTION"
  | "NOT_EXECUTED_HERE"
  | "EXECUTING"
  | "COMPLETED"
  | "PARTIAL_FAILED"
  | "CANCELLED";

export interface RequestStatusView {
  readonly requestId: string;
  readonly subjectRef: string;
  readonly kind: DataRequestKind;
  readonly mode: DeleteMode | null;
  readonly requestSource: RequestSource;
  readonly verification: {
    readonly state: VerificationState;
    readonly method: VerificationMethod | null;
    readonly decidedAt: string | null;
  };
  readonly execution: ExecutionState;
  readonly stage: RequestStage;
  readonly targets: readonly {
    readonly targetKind: string;
    readonly state: DeletionItemState;
    readonly errorCode: string | null;
  }[];
  readonly counts: { readonly done: number; readonly failed: number; readonly pending: number };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const FORBIDDEN: RouteResponse = { status: 403, body: { error: "FORBIDDEN" } };

export function mayHandleData(actor: DataActor): boolean {
  return actor.capabilities.has(DATA_HANDLE_CAPABILITY);
}

export function notFound(code: string): RouteResponse {
  return { status: 404, body: { error: code } };
}

export function conflict(code: string): RouteResponse {
  return { status: 409, body: { error: code } };
}

/** The stage a request is in. Execution states other than PENDING are written by the execution path (STORY-019). */
export function stageOf(record: DataRequestRecord): RequestStage {
  if (record.verificationState === "PENDING") return "AWAITING_VERIFICATION";
  if (record.verificationState === "REJECTED") return "REJECTED";
  switch (record.executionState) {
    case "RUNNING":
      return "EXECUTING";
    case "COMPLETED":
      return "COMPLETED";
    case "PARTIAL_FAILED":
      return "PARTIAL_FAILED";
    case "CANCELLED":
      return "CANCELLED";
    case "PENDING":
      return record.kind === "DELETE" || record.kind === "RESUME_SCORING" ? "AWAITING_EXECUTION" : "NOT_EXECUTED_HERE";
  }
}

/** Builds the status view of one request from its row and its deletion targets. */
export function statusView(record: DataRequestRecord, items: readonly DataRequestItemRecord[]): RequestStatusView {
  return {
    requestId: record.id,
    subjectRef: record.subjectId,
    kind: record.kind,
    mode: record.mode,
    requestSource: record.requestSource,
    verification: {
      state: record.verificationState,
      method: record.verificationMethod,
      decidedAt: record.verifiedAt ?? (record.verificationState === "REJECTED" ? record.updatedAt : null),
    },
    execution: record.executionState,
    stage: stageOf(record),
    targets: items.map((item) => ({ targetKind: item.targetKind, state: item.itemState, errorCode: item.errorCode })),
    counts: {
      done: items.filter((item) => item.itemState === "DONE").length,
      failed: items.filter((item) => item.itemState === "FAILED").length,
      pending: items.filter((item) => item.itemState === "PENDING").length,
    },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Registers one request. Nothing about the subject changes: no score, list, exception or generation is written. The
 * request and its Change Log row are one transaction.
 */
export function registerRequest(deps: DataDeps, actor: DataActor, input: RegisterInput): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const subject = deps.subjects.readSubject(actor.channelId, input.subjectRef);
  if (subject === undefined) return notFound("SUBJECT_NOT_FOUND");

  const at = deps.now();
  const iso = at.toISOString();
  const record: DataRequestRecord = {
    id: deps.newId(),
    channelId: actor.channelId,
    subjectId: input.subjectRef,
    kind: input.kind,
    mode: input.mode,
    requestSource: input.requestSource,
    verificationState: "PENDING",
    verificationMethod: null,
    executionState: "PENDING",
    createdAt: iso,
    verifiedAt: null,
    completedAt: null,
    updatedAt: iso,
    handledByRef: null,
  };
  deps.requests.insertRequest(
    record,
    dataRequestChange(deps, {
      channelId: actor.channelId,
      actorRef: actor.accountId,
      summary: `DATA_REQUEST registered kind=${input.kind} mode=${input.mode ?? "NONE"} source=${input.requestSource} request=${record.id}`,
      summaryCode: "DATA_REQUEST_REGISTERED",
      summaryParams: {
        kind: input.kind,
        mode: input.mode ?? "NONE",
        requestSource: input.requestSource,
        requestId: record.id,
      },
      at,
    }),
  );
  return { status: 201, body: statusView(record, []) };
}

/**
 * Records the verification decision. It applies once. A verified request keeps its execution state at PENDING, ready
 * for the execution path. A rejected request is CANCELLED and never runs.
 */
export function recordVerification(
  deps: DataDeps,
  actor: DataActor,
  requestId: string,
  input: VerificationInput,
): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const current = deps.requests.readRequest(actor.channelId, requestId);
  if (current === undefined) return notFound("REQUEST_NOT_FOUND");
  if (current.verificationState !== "PENDING") return conflict("ALREADY_DECIDED");

  const at = deps.now();
  const update: VerificationUpdate = {
    requestId,
    channelId: actor.channelId,
    verificationState: input.verdict,
    verificationMethod: input.method,
    executionState: input.verdict === "VERIFIED" ? "PENDING" : "CANCELLED",
    decidedAt: at.toISOString(),
    handledByRef: actor.accountId,
  };
  const outcome = deps.requests.decideVerification(
    update,
    dataRequestChange(deps, {
      channelId: actor.channelId,
      actorRef: actor.accountId,
      summary: `DATA_REQUEST verification=${input.verdict} method=${input.method ?? "NONE"} request=${requestId}`,
      summaryCode: "DATA_REQUEST_VERIFIED",
      summaryParams: {
        verdict: input.verdict,
        method: input.method ?? "NONE",
        requestId,
      },
      at,
    }),
  );
  if (outcome === "NOT_FOUND") return notFound("REQUEST_NOT_FOUND");
  if (outcome === "ALREADY_DECIDED") return conflict("ALREADY_DECIDED");

  const latest = deps.requests.readRequest(actor.channelId, requestId);
  if (latest === undefined) return notFound("REQUEST_NOT_FOUND");
  return { status: 200, body: statusView(latest, deps.requests.readItems(requestId)) };
}

/** Reads one request's status. Another channel's request reads as not found. */
export function requestDetail(deps: DataDeps, actor: DataActor, requestId: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const record = deps.requests.readRequest(actor.channelId, requestId);
  if (record === undefined) return notFound("REQUEST_NOT_FOUND");
  return { status: 200, body: statusView(record, deps.requests.readItems(record.id)) };
}

/** Lists the requests of one subject in the actor's channel. A subject from another channel lists nothing. */
export function listRequestViews(deps: DataDeps, actor: DataActor, subjectRef: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const views = deps.requests
    .listRequests(actor.channelId, subjectRef)
    .map((record) => statusView(record, deps.requests.readItems(record.id)));
  return { status: 200, body: views };
}
