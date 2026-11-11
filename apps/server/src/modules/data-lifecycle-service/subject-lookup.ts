import { FORBIDDEN, mayHandleData, notFound, statusView } from "./requests.js";
import type { DataActor, DataDeps, RouteResponse } from "./types.js";

/** Notices the panel shows with every subject. The page writes the text for each code. */
export const SUBJECT_NOTICES = ["PROVIDER_COPY_NOT_CONTROLLED"] as const;

/**
 * The subject panel. It shows what this instance holds about one subject: score, identity source, list and exception
 * state, retained data by category with its retention, and the subject's requests. Nicknames and content never appear.
 * Retained data is shown as counts from the log index, so the panel cannot be used to read the logs.
 */
export function subjectPanel(deps: DataDeps, actor: DataActor, subjectRef: string): RouteResponse {
  if (!mayHandleData(actor)) return FORBIDDEN;
  const facts = deps.subjects.readSubject(actor.channelId, subjectRef);
  if (facts === undefined) return notFound("SUBJECT_NOT_FOUND");

  const scope = deps.logs.locateSubjectLogs(subjectRef);
  const requests = deps.requests
    .listRequests(actor.channelId, subjectRef)
    .map((record) => statusView(record, deps.requests.readItems(record.id)));
  return {
    status: 200,
    body: {
      subjectRef,
      currentScore: facts.currentScore,
      identity: facts.identity,
      list: facts.list,
      exception: facts.exception === null ? null : { active: true, createdAt: facts.exception.createdAt },
      ledgerEntryCount: facts.ledgerEntryCount,
      retention: [
        { category: "TECHNICAL_LOG", count: scope.logIds.length, retentionDays: deps.retentionDays.metadata },
        { category: "EVIDENCE", count: scope.evidenceIds.length, retentionDays: deps.retentionDays.evidence },
        { category: "CHANGE_LOG", count: scope.changeLogIds.length, retentionDays: deps.retentionDays.metadata },
      ],
      requests,
      notices: SUBJECT_NOTICES,
    },
  };
}
