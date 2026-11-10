import type {
  ScoreCommitRequest,
  ScoreCommitResult,
  ScoreSubjectState,
  ScoringLedgerPort,
} from "@voxward/contracts";

export interface FakeSubject {
  readonly subjectRef: string;
  identityKind: ScoreSubjectState["identityKind"];
  identityBaseScore: number;
  behaviorAdjustTotal: number;
  currentScore: number;
  version: number;
  lastRewardAt: string | null;
  exceptionActive: boolean;
}

export interface FakeEntry {
  readonly subjectRef: string;
  readonly idempotencyKey: string;
  readonly reasonCode: string;
  readonly requestedDelta: number;
  readonly actualDelta: number;
}

/**
 * In-memory storage for module tests. It follows the port contract: one decision per call, a duplicate key
 * changes nothing, and a write is all or nothing. It is a test double, not a second implementation of storage.
 */
export class FakeLedger implements ScoringLedgerPort {
  readonly entries: FakeEntry[] = [];
  calls = 0;
  private readonly subjects = new Map<string, FakeSubject>();
  private readonly keys = new Map<string, FakeEntry>();
  private nextSubject = 1;

  commitScoreDecision(request: ScoreCommitRequest): ScoreCommitResult {
    this.calls += 1;
    const subject = this.subjectFor(request.subject.channelId, request.subject.subjectKey);

    const seen = this.keys.get(request.idempotencyKey);
    if (seen !== undefined) {
      return { status: "duplicate", subjectRef: subject.subjectRef, actualDelta: seen.actualDelta };
    }

    const decision = request.decide(snapshot(subject));
    if (decision.kind === "no_effect") {
      return { status: "no_effect", subjectRef: subject.subjectRef, reason: decision.reason };
    }
    if (decision.kind === "refused") {
      return { status: "refused", subjectRef: subject.subjectRef, reason: decision.reason };
    }

    const write = decision.write;
    let ledgerId: string | null = null;
    if (write.actualDelta !== 0) {
      subject.identityBaseScore = write.nextIdentityBaseScore;
      subject.behaviorAdjustTotal = write.nextBehaviorAdjustTotal;
      subject.currentScore = write.nextCurrentScore;
      subject.lastRewardAt = write.lastRewardAt;
      subject.version += 1;
      const entry: FakeEntry = {
        subjectRef: subject.subjectRef,
        idempotencyKey: request.idempotencyKey,
        reasonCode: write.reasonCode,
        requestedDelta: write.requestedDelta,
        actualDelta: write.actualDelta,
      };
      this.entries.push(entry);
      this.keys.set(request.idempotencyKey, entry);
      ledgerId = `ledger-${this.entries.length}`;
    }
    return { status: "applied", subjectRef: subject.subjectRef, actualDelta: write.actualDelta, ledgerId };
  }

  /** Current state of a subject, or undefined when no decision has touched it yet. */
  stateOf(channelId: string, subjectKey: string): ScoreSubjectState | undefined {
    const subject = this.subjects.get(mapKey(channelId, subjectKey));
    return subject === undefined ? undefined : snapshot(subject);
  }

  markException(channelId: string, subjectKey: string, active: boolean): void {
    this.subjectFor(channelId, subjectKey).exceptionActive = active;
  }

  private subjectFor(channelId: string, subjectKey: string): FakeSubject {
    const key = mapKey(channelId, subjectKey);
    const existing = this.subjects.get(key);
    if (existing !== undefined) return existing;
    const created: FakeSubject = {
      subjectRef: `subject-${this.nextSubject}`,
      identityKind: "UNKNOWN",
      identityBaseScore: 0,
      behaviorAdjustTotal: 0,
      currentScore: 0,
      version: 0,
      lastRewardAt: null,
      exceptionActive: false,
    };
    this.nextSubject += 1;
    this.subjects.set(key, created);
    return created;
  }
}

function mapKey(channelId: string, subjectKey: string): string {
  return `${channelId}\u0000${subjectKey}`;
}

function snapshot(subject: FakeSubject): ScoreSubjectState {
  return {
    subjectRef: subject.subjectRef,
    identityKind: subject.identityKind,
    identityBaseScore: subject.identityBaseScore,
    behaviorAdjustTotal: subject.behaviorAdjustTotal,
    currentScore: subject.currentScore,
    version: subject.version,
    lastRewardAt: subject.lastRewardAt,
    exceptionActive: subject.exceptionActive,
  };
}
