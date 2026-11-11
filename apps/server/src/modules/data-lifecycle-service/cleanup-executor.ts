import {
  DELETION_TARGET_KINDS,
  EVIDENCE_KINDS,
  type CleanupFacts,
  type DataRequestItemRecord,
  type DataRequestRecord,
  type DeletionTargetKind,
  type EvidenceKind,
  type SubjectLogScope,
} from "@voxward/contracts";
import { dataRequestChange } from "./change-row.js";
import { cleaningRank, type CleanupTarget } from "./cleanup-targets.js";
import { startDeletionRequest } from "./delete-with-exception.js";
import { conflict, FORBIDDEN, mayHandleData, notFound, statusView } from "./requests.js";
import { resumeScoring } from "./resume-scoring.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";

/** Codes that a surface failure can record. A code is stored; the text of the error never is. */
const CLEANUP_FAILED = "CLEANUP_FAILED";
const UNKNOWN_SURFACE = "UNKNOWN_SURFACE";
const SURFACE_NOT_REGISTERED = "SURFACE_NOT_REGISTERED";
/** The exception that DELETE_AND_EXCEPT creates is not in effect once the cleanup has run. */
const EXCEPTION_NOT_CONFIRMED = "EXCEPTION_NOT_CONFIRMED";

/** A refusal raised while cleaning one surface. The code is the only thing the item records. */
class SurfaceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "SurfaceError";
    this.code = code;
  }
}

/**
 * Executes one verified request (S019, SUB-035 and SUB-036). A DELETE that has not started is started first. Then its
 * storage surfaces are cleaned in order. A RESUME_SCORING request lifts the exception. Repeating the call is safe: a
 * COMPLETED deletion changes nothing, and a surface that is DONE is not cleaned again.
 */
export function executeRequest(deps: DataDeps, actor: DataActor, requestId: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const record = deps.requests.readRequest(actor.channelId, requestId);
  if (record === undefined) return notFound("REQUEST_NOT_FOUND");
  if (record.kind === "RESUME_SCORING") return resumeScoring(deps, actor, record.subjectId, requestId);
  if (record.kind !== "DELETE") return conflict("NOT_EXECUTABLE");
  if (record.executionState === "PENDING") {
    const started = startDeletionRequest(deps, actor, requestId);
    if (started.status !== 200) return started;
  }
  return runCleanup(deps, actor, requestId);
}

/**
 * Cleans a started deletion one surface at a time, in cleaning order, and stops at the first failure. The request is
 * COMPLETED only when every surface is DONE and, for DELETE_AND_EXCEPT, the exception is still in effect. Otherwise it is
 * PARTIAL_FAILED. A later call resumes from the first surface that is not DONE.
 */
function runCleanup(deps: DataDeps, actor: DataActor, requestId: string): RouteResponse {
  const record = deps.requests.readRequest(actor.channelId, requestId);
  if (record === undefined) return notFound("REQUEST_NOT_FOUND");
  if (record.executionState === "COMPLETED") return viewOf(deps, record);
  if (record.executionState !== "RUNNING" && record.executionState !== "PARTIAL_FAILED") {
    return conflict("NOT_EXECUTABLE");
  }
  const facts = deps.cleanup.readCleanupFacts(record.channelId, record.subjectId);
  if (facts === undefined) return notFound("SUBJECT_NOT_FOUND");

  const pending = deps.requests
    .readItems(requestId)
    .filter((item) => item.itemState !== "DONE")
    .map((item) => ({ item, target: targetOf(item) }))
    .sort((a, b) => cleaningRank(a.target) - cleaningRank(b.target));
  for (const { target } of pending) {
    if (!runSurface(deps, record, facts, target)) break;
  }

  const unfinished = deps.requests.readItems(requestId).filter((item) => item.itemState !== "DONE");
  if (unfinished.length > 0) {
    finish(deps, actor, record, "PARTIAL_FAILED", `DATA_REQUEST cleanup incomplete, unfinished=${unfinished.length}`);
  } else if (record.mode === "DELETE_AND_EXCEPT" && !exceptionInEffect(deps, record)) {
    finish(deps, actor, record, "PARTIAL_FAILED", `DATA_REQUEST ${EXCEPTION_NOT_CONFIRMED}`);
  } else {
    finish(deps, actor, record, "COMPLETED", "DATA_REQUEST cleanup completed");
  }
  return viewOf(deps, record);
}

/** Cleans one surface and records its result. Returns true when the surface is DONE, false when it failed. */
function runSurface(deps: DataDeps, record: DataRequestRecord, facts: CleanupFacts, target: CleanupTarget): boolean {
  try {
    cleanSurface(deps, record, facts, target);
  } catch (error) {
    mark(deps, record, target, "FAILED", codeOf(error));
    return false;
  }
  mark(deps, record, target, "DONE", null);
  return true;
}

function cleanSurface(deps: DataDeps, record: DataRequestRecord, facts: CleanupFacts, target: CleanupTarget): void {
  const { subjectId } = record;
  switch (target.targetKind) {
    case "CHANGE_LOG":
      publish(deps, deps.logs.certifySubjectChangeLogs(subjectId, deps.certificateSummary));
      return;
    case "TECHNICAL_LOG_EVIDENCE":
      publish(deps, deps.logs.removeSubjectEvidence(subjectId, evidenceKindOf(target.targetRef)));
      return;
    case "TECHNICAL_LOG":
      publish(deps, deps.logs.removeSubjectTechnicalRows(subjectId));
      return;
    case "CANDIDATE_CARD":
    case "CACHE":
      forgetInProcess(deps, record, facts, target.targetRef);
      return;
    case "TASK":
      // A technical row that is still attached to a task would block the task's delete. The rows of the subject are
      // swept again first. The sweep is idempotent, and it publishes what it removes.
      publish(deps, deps.logs.removeSubjectTechnicalRows(subjectId));
      cleanDatabase(deps, record, target.targetKind);
      return;
    default:
      cleanDatabase(deps, record, target.targetKind);
  }
}

function cleanDatabase(deps: DataDeps, record: DataRequestRecord, targetKind: DeletionTargetKind): void {
  deps.cleanup.cleanSurface({
    channelId: record.channelId,
    subjectId: record.subjectId,
    targetKind,
    at: deps.now().toISOString(),
  });
}

/**
 * Drops the subject's entries from one in-process surface. A surface this process does not hold cannot be cleaned, so it
 * is a failure. It is never recorded as done.
 */
function forgetInProcess(deps: DataDeps, record: DataRequestRecord, facts: CleanupFacts, name: string): void {
  if (!deps.caches.names.includes(name)) throw new SurfaceError(SURFACE_NOT_REGISTERED);
  deps.caches.forgetSubject(name, record.channelId, facts.platformSubjectKey, facts.correlationIds);
}

/** Publishes what a log step removed or certified. A step that found nothing publishes nothing. */
function publish(deps: DataDeps, scope: SubjectLogScope): void {
  if (scope.logIds.length === 0 && scope.changeLogIds.length === 0) return;
  deps.publishInvalidation({
    reason: "DELETED",
    logIds: scope.logIds,
    correlationIds: scope.correlationIds,
    changeLogIds: scope.changeLogIds,
  });
}

function exceptionInEffect(deps: DataDeps, record: DataRequestRecord): boolean {
  const subject = deps.subjects.readSubject(record.channelId, record.subjectId);
  return subject !== undefined && subject.exception !== null;
}

function mark(
  deps: DataDeps,
  record: DataRequestRecord,
  target: CleanupTarget,
  state: "DONE" | "FAILED",
  errorCode: string | null,
): void {
  deps.requests.markItem({
    requestId: record.id,
    targetKind: target.targetKind,
    targetRef: target.targetRef,
    state,
    errorCode,
    at: deps.now().toISOString(),
  });
}

function finish(
  deps: DataDeps,
  actor: DataActor,
  record: DataRequestRecord,
  executionState: "COMPLETED" | "PARTIAL_FAILED",
  summary: string,
): void {
  const at = deps.now();
  deps.requests.finishExecution({
    requestId: record.id,
    channelId: record.channelId,
    executionState,
    at: at.toISOString(),
    change: dataRequestChange(deps, {
      channelId: record.channelId,
      actorRef: actor.accountId,
      summary,
      at,
      outcome: executionState === "COMPLETED" ? "SUCCEEDED" : "PARTIAL",
    }),
  });
}

function viewOf(deps: DataDeps, record: DataRequestRecord): RouteResponse {
  const latest = deps.requests.readRequest(record.channelId, record.id) ?? record;
  return { status: 200, body: statusView(latest, deps.requests.readItems(record.id)) };
}

/** Reads a stored item's kind as the contract's type. A kind the contract does not know is a refusal, not a guess. */
function targetOf(item: DataRequestItemRecord): CleanupTarget {
  const targetKind = (DELETION_TARGET_KINDS as readonly string[]).find((known) => known === item.targetKind);
  if (targetKind === undefined) throw new SurfaceError(UNKNOWN_SURFACE);
  return { targetKind: targetKind as DeletionTargetKind, targetRef: item.targetRef };
}

function evidenceKindOf(ref: string): EvidenceKind {
  const kind = (EVIDENCE_KINDS as readonly string[]).find((known) => known === ref);
  if (kind === undefined) throw new SurfaceError(UNKNOWN_SURFACE);
  return kind as EvidenceKind;
}

/** The code of a failure. An error's own code is kept only when it has the shape of a code; anything else is generic. */
function codeOf(error: unknown): string {
  if (error instanceof SurfaceError) return error.code;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z][A-Z_]{2,63}$/.test(code) ? code : CLEANUP_FAILED;
}
