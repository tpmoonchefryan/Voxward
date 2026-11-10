import type { AuditLogPort, SubjectLogScope } from "@voxward/contracts";
import type { InvalidationEvent } from "./invalidation.js";
import { requireText } from "./validate.js";

/**
 * Replaces the summary of each Change Log row on a deleted processing chain. Proposal §11.3 keeps a minimal processing
 * certificate that has no message body and no historical score. The text is an implementation choice.
 */
export const CERTIFICATE_SUMMARY = "DATA_REQUEST_CERTIFICATE";

/** Where one subject's controlled content sits in the logs. Identifiers only; a read changes nothing. */
export function locateSubjectLogContent(port: AuditLogPort, subjectId: string): SubjectLogScope {
  return port.locateSubjectLogs(requireSubjectId(subjectId));
}

/**
 * Deletes one subject's controlled content from the logs, then publishes the invalidation event. The deletion is one
 * database transaction. Publishing happens after it commits, so a listener cannot roll it back. Other subjects in the
 * same micro-batch are untouched.
 */
export function removeSubjectLogContent(
  port: AuditLogPort,
  subjectId: string,
  publish: (event: InvalidationEvent) => void,
): SubjectLogScope {
  const scope = port.removeSubjectLogs(requireSubjectId(subjectId), CERTIFICATE_SUMMARY);
  // A repeat deletion finds nothing left to remove, so it publishes nothing.
  if (scope.logIds.length > 0 || scope.changeLogIds.length > 0) {
    publish({
      reason: "DELETED",
      logIds: scope.logIds,
      correlationIds: scope.correlationIds,
      changeLogIds: scope.changeLogIds,
    });
  }
  return scope;
}

function requireSubjectId(subjectId: string): string {
  return requireText(subjectId, "subjectId", 128);
}
