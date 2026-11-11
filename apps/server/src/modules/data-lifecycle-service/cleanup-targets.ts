import type { DeletionTargetKind } from "@voxward/contracts";

/**
 * One storage surface a deletion registers. `targetRef` is the subject for subject-wide surfaces. For a log evidence
 * surface it is the evidence kind, and for an in-process surface it is the surface's name.
 */
export interface CleanupTarget {
  readonly targetKind: DeletionTargetKind;
  readonly targetRef: string;
}

/** The evidence kinds of a technical log, in cleaning order. ITEM_ID_MAP is the mapping surface (design §6). */
export const EVIDENCE_SURFACES = ["MESSAGE_TEXT", "TRANSLATION", "VALIDATED_JSON", "ITEM_ID_MAP"] as const;

/**
 * The surfaces of one subject, in cleaning order (design §6). The order follows the dependencies: correlation values are
 * read from events and logs before those rows are removed, and child rows go before their parents. Each in-process
 * surface named by `cacheNames` gets one item after the database surfaces that feed it.
 */
export function deletionTargets(subjectId: string, cacheNames: readonly string[]): readonly CleanupTarget[] {
  const inProcess = cacheNames.map(
    (name): CleanupTarget => ({
      targetKind: name === "CANDIDATE_CARD" ? "CANDIDATE_CARD" : "CACHE",
      targetRef: name,
    }),
  );
  const candidateCards = inProcess.filter((target) => target.targetKind === "CANDIDATE_CARD");
  const caches = inProcess.filter((target) => target.targetKind === "CACHE");
  const subjectWide = (targetKind: DeletionTargetKind): CleanupTarget => ({ targetKind, targetRef: subjectId });

  return [
    subjectWide("CHANGE_LOG"),
    ...EVIDENCE_SURFACES.map((kind): CleanupTarget => ({ targetKind: "TECHNICAL_LOG_EVIDENCE", targetRef: kind })),
    subjectWide("TECHNICAL_LOG"),
    ...candidateCards,
    subjectWide("SCORE_OUTCOME"),
    subjectWide("SCORE_LEDGER"),
    subjectWide("SUBJECT_IDENTITY"),
    subjectWide("NICKNAME_CHANGE"),
    subjectWide("SUBJECT_SCORE"),
    subjectWide("DELIVERY"),
    subjectWide("VERDICT"),
    subjectWide("TASK"),
    subjectWide("CHANNEL_EVENT"),
    ...caches,
  ];
}
