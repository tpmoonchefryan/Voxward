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


/**
 * The cleaning order of the surface kinds (design §6). The executor sorts a request's items by this rank, because the
 * stored items carry no order and their identifiers are random. The ranks must match the order of `deletionTargets`.
 */
const CLEANING_ORDER: readonly DeletionTargetKind[] = [
  "CHANGE_LOG",
  "TECHNICAL_LOG_EVIDENCE",
  "TECHNICAL_LOG",
  "CANDIDATE_CARD",
  "SCORE_OUTCOME",
  "SCORE_LEDGER",
  "SUBJECT_IDENTITY",
  "NICKNAME_CHANGE",
  "SUBJECT_SCORE",
  "DELIVERY",
  "VERDICT",
  "TASK",
  "CHANNEL_EVENT",
  "CACHE",
];

/** A total order over the surfaces of one request. Evidence kinds keep the order of EVIDENCE_SURFACES. */
export function cleaningRank(target: CleanupTarget): number {
  const kindRank = CLEANING_ORDER.indexOf(target.targetKind);
  if (kindRank < 0) return CLEANING_ORDER.length * 10;
  if (target.targetKind !== "TECHNICAL_LOG_EVIDENCE") return kindRank * 10;
  return kindRank * 10 + (EVIDENCE_SURFACES as readonly string[]).indexOf(target.targetRef);
}
