import { randomUUID } from "node:crypto";
import type {
  IdentityFact,
  IdentityKind,
  ScoreCommitRequest,
  ScoreCommitResult,
  ScoreSubjectState,
  ScoreWrite,
  ScoringLedgerPort,
} from "@voxward/contracts";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { ScoreLedgerStore, SubjectStore } from "./repository.js";
import { scoreExceptions, scoreLedger, subjectIdentities, subjectScores, subjects } from "./schema/index.js";
import { runShortTransaction, type ShortTransaction } from "./transaction.js";

export interface ScoringLedgerBindingOptions {
  /** Identifier source for new rows. Injectable so tests can predict row identifiers. */
  readonly newId?: () => string;
}

/**
 * Database implementation of ScoringLedgerPort. Each call is one short synchronous transaction: the duplicate
 * check, the subject lookup, the state read, the decision and the writes all run inside it. A concurrent writer
 * cannot slip in between the read and the write.
 */
export function createScoringLedgerPort(
  database: VoxwardDatabase,
  options: ScoringLedgerBindingOptions = {},
): ScoringLedgerPort {
  const newId = options.newId ?? randomUUID;
  return {
    commitScoreDecision(request: ScoreCommitRequest): ScoreCommitResult {
      return runShortTransaction(database, (tx) => commitInTransaction(tx, request, newId));
    },
  };
}

function commitInTransaction(
  tx: ShortTransaction,
  request: ScoreCommitRequest,
  newId: () => string,
): ScoreCommitResult {
  const earlier = tx
    .select({ subjectId: scoreLedger.subjectId, actualDelta: scoreLedger.actualDelta })
    .from(scoreLedger)
    .where(eq(scoreLedger.idempotencyKey, request.idempotencyKey))
    .get();
  if (earlier !== undefined) {
    return { status: "duplicate", subjectRef: earlier.subjectId, actualDelta: earlier.actualDelta };
  }

  if (request.identityEventRef !== undefined) {
    const fact = tx
      .select({ subjectId: subjectIdentities.subjectId })
      .from(subjectIdentities)
      .where(eq(subjectIdentities.sourceEventRef, request.identityEventRef))
      .get();
    if (fact !== undefined) return { status: "duplicate", subjectRef: fact.subjectId, actualDelta: 0 };
  }

  const subjectId = findOrCreateSubject(tx, request, newId);
  const state = readState(tx, request.subject.channelId, subjectId);
  const decision = request.decide(state);
  if (decision.kind === "no_effect") return { status: "no_effect", subjectRef: subjectId, reason: decision.reason };
  if (decision.kind === "refused") return { status: "refused", subjectRef: subjectId, reason: decision.reason };
  return persistWrite(tx, request, subjectId, state, decision.write, newId);
}

function findOrCreateSubject(tx: ShortTransaction, request: ScoreCommitRequest, newId: () => string): string {
  const { channelId, subjectKey } = request.subject;
  const existing = tx
    .select({ id: subjects.id })
    .from(subjects)
    .where(and(eq(subjects.channelId, channelId), eq(subjects.platformSubjectKey, subjectKey)))
    .get();
  if (existing !== undefined) return existing.id;

  const id = newId();
  SubjectStore.create(tx, { id, channelId, platformSubjectKey: subjectKey, createdAt: request.committedAt });
  return id;
}

function readState(tx: ShortTransaction, channelId: string, subjectId: string): ScoreSubjectState {
  const score = tx
    .select({
      identityBaseScore: subjectScores.identityBaseScore,
      behaviorAdjustTotal: subjectScores.behaviorAdjustTotal,
      currentScore: subjectScores.currentScore,
      version: subjectScores.version,
      lastRewardAt: subjectScores.lastRewardAt,
    })
    .from(subjectScores)
    .where(eq(subjectScores.subjectId, subjectId))
    .get();
  if (score === undefined) throw new Error(`subject ${subjectId} has no score row`);

  const identity = tx
    .select({ kind: subjectIdentities.identityKind })
    .from(subjectIdentities)
    .where(and(eq(subjectIdentities.subjectId, subjectId), isNull(subjectIdentities.effectiveTo)))
    .orderBy(desc(subjectIdentities.effectiveFrom))
    .limit(1)
    .get();

  const exception = tx
    .select({ id: scoreExceptions.id })
    .from(scoreExceptions)
    .where(
      and(
        eq(scoreExceptions.channelId, channelId),
        eq(scoreExceptions.subjectId, subjectId),
        isNull(scoreExceptions.removedAt),
      ),
    )
    .get();

  return {
    subjectRef: subjectId,
    // The identity_kind CHECK constraint guarantees the stored value is one of IDENTITY_KINDS.
    identityKind: (identity?.kind ?? "UNKNOWN") as IdentityKind,
    identityBaseScore: score.identityBaseScore,
    behaviorAdjustTotal: score.behaviorAdjustTotal,
    currentScore: score.currentScore,
    version: score.version,
    lastRewardAt: score.lastRewardAt,
    exceptionActive: exception !== undefined,
  };
}

function persistWrite(
  tx: ShortTransaction,
  request: ScoreCommitRequest,
  subjectId: string,
  before: ScoreSubjectState,
  write: ScoreWrite,
  newId: () => string,
): ScoreCommitResult {
  let ledgerId: string | null = null;
  // The score row and the ledger change when the total moves. They also change when the identity base moves at a limit:
  // the total stays put, but the base must be stored, or a later expiry would deduct points that were never added.
  const identityBaseMoved = write.nextIdentityBaseScore !== before.identityBaseScore;
  if (write.actualDelta !== 0 || identityBaseMoved) {
    const stored = SubjectStore.compareAndSetScore(tx, {
      subjectId,
      expectedVersion: before.version,
      identityBaseScore: write.nextIdentityBaseScore,
      behaviorAdjustTotal: write.nextBehaviorAdjustTotal,
      currentScore: write.nextCurrentScore,
      lastRewardAt: write.lastRewardAt,
      updatedAt: request.committedAt,
    });
    if (stored.status !== "updated") {
      throw new Error(`score row of subject ${subjectId} changed inside one immediate transaction`);
    }

    ledgerId = newId();
    const appended = ScoreLedgerStore.appendIfNew(tx, {
      id: ledgerId,
      subjectId,
      idempotencyKey: request.idempotencyKey,
      reasonCode: write.reasonCode,
      requestedDelta: write.requestedDelta,
      actualDelta: write.actualDelta,
      ruleVersion: write.ruleVersion,
      verdictRef: write.verdictRef,
      correlationId: write.correlationId,
      createdAt: request.committedAt,
    });
    if (appended.status !== "created") {
      throw new Error("idempotency key was recorded inside one immediate transaction");
    }
  }

  if (write.identityFact !== undefined) {
    recordIdentityFact(tx, subjectId, write.identityFact, newId(), request.committedAt);
  }
  return { status: "applied", subjectRef: subjectId, actualDelta: write.actualDelta, ledgerId };
}

/** Closes the open identity row, then inserts the new one, so at most one identity is current. */
function recordIdentityFact(
  tx: ShortTransaction,
  subjectId: string,
  fact: IdentityFact,
  id: string,
  observedAt: string,
): void {
  tx.update(subjectIdentities)
    .set({ effectiveTo: fact.effectiveFrom })
    .where(and(eq(subjectIdentities.subjectId, subjectId), isNull(subjectIdentities.effectiveTo)))
    .run();
  tx.insert(subjectIdentities)
    .values({
      id,
      subjectId,
      identityKind: fact.kind,
      sourceEventRef: fact.sourceEventRef,
      effectiveFrom: fact.effectiveFrom,
      effectiveTo: null,
      observedAt,
    })
    .run();
}
