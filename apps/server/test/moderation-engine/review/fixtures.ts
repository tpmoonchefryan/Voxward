import type { AiBatchInput, ChannelEvent, InternalClassification } from "@voxward/contracts";
import { createScoringEngine } from "../../../src/modules/scoring-engine/index.js";
import {
  type CandidateProposal,
  type CandidateProposalPort,
  type PendingScoring,
  type ReviewCandidate,
  type ReviewModelPort,
  type ReviewQueuePort,
  type ReviewRecord,
  type ReviewStorePort,
  type ScoringPort,
  type ScoringState,
  type SettlementCommit,
  type SettlementWrite,
  type StoredSettlementState,
} from "../../../src/modules/moderation-engine/review/ports.js";
import { createReviewRunner, type ReviewRunnerDeps } from "../../../src/modules/moderation-engine/review/runner.js";
import { FakeLedger } from "../../scoring-engine/fake-ledger.js";
import { eventOf, harnessWith, sequentialIds, START } from "../../task-coordinator/helpers.js";

/** One stored message row, mutable the way a database row is. Synthetic data only. */
interface Row {
  readonly eventId: string;
  readonly event: ChannelEvent;
  state: StoredSettlementState;
  settlementDeadlineAt: string | null;
  evidenceExpiresAt: string;
  exceptionMarked: boolean;
  deletionInProgress: boolean;
  manuallyDecided: boolean;
  scoring: ScoringState;
  classification: InternalClassification | null;
}

/**
 * In-memory review storage. `commitSettlement` is a compare-and-set on the stored state, as the port requires, so a
 * message that already left UNSETTLED_FAST_PASS is never written twice.
 */
export class MemoryReviewStore implements ReviewStorePort {
  private readonly rows = new Map<string, Row>();
  readonly writes: SettlementWrite[] = [];

  seed(row: {
    readonly eventId: string;
    readonly event: ChannelEvent;
    readonly state?: StoredSettlementState;
    readonly settlementDeadlineAt?: string | null;
    readonly evidenceExpiresAt?: string;
    readonly exceptionMarked?: boolean;
  }): void {
    this.rows.set(row.eventId, {
      eventId: row.eventId,
      event: row.event,
      state: row.state ?? "UNSETTLED_FAST_PASS",
      settlementDeadlineAt: row.settlementDeadlineAt ?? null,
      evidenceExpiresAt: row.evidenceExpiresAt ?? "2026-11-12T00:00:00.000Z",
      exceptionMarked: row.exceptionMarked ?? false,
      deletionInProgress: false,
      manuallyDecided: false,
      scoring: "NOT_REQUIRED",
      classification: null,
    });
  }

  /** A person decided the message first. The verdict is current, and the settlement state is left as it was. */
  decideManually(eventId: string): void {
    this.rowOf(eventId).manuallyDecided = true;
  }

  markDeletionInProgress(eventId: string): void {
    this.rowOf(eventId).deletionInProgress = true;
  }

  stateOf(eventId: string): StoredSettlementState {
    return this.rowOf(eventId).state;
  }

  scoringOf(eventId: string): ScoringState {
    return this.rowOf(eventId).scoring;
  }

  listOpenCandidates(channelId: string): readonly ReviewCandidate[] {
    return [...this.rows.values()]
      .filter((row) => row.event.channelId === channelId && row.state === "UNSETTLED_FAST_PASS")
      .map((row) => snapshotOf(row));
  }

  readCandidate(eventId: string): ReviewCandidate | undefined {
    const row = this.rows.get(eventId);
    return row === undefined ? undefined : snapshotOf(row);
  }

  markExpired(eventId: string): void {
    this.rowOf(eventId).state = "UNSETTLED_EXPIRED";
  }

  commitSettlement(write: SettlementWrite): SettlementCommit {
    const row = this.rowOf(write.eventId);
    if (row.state !== "UNSETTLED_FAST_PASS") return { status: "NOT_ELIGIBLE", reason: "STATE_CHANGED" };
    row.state = "SETTLED";
    row.classification = write.classification;
    row.scoring = "PENDING";
    this.writes.push(write);
    return { status: "SETTLED" };
  }

  markScoring(eventId: string, state: ScoringState): void {
    this.rowOf(eventId).scoring = state;
  }

  listPendingScoring(): readonly PendingScoring[] {
    return [...this.rows.values()]
      .filter((row) => row.scoring === "PENDING" && row.classification !== null)
      .map((row) => ({ eventId: row.eventId, event: row.event, classification: row.classification as InternalClassification }));
  }

  private rowOf(eventId: string): Row {
    const row = this.rows.get(eventId);
    if (row === undefined) throw new Error(`fixture has no row ${eventId}`);
    return row;
  }
}

function snapshotOf(row: Row): ReviewCandidate {
  return {
    eventId: row.eventId,
    event: row.event,
    settlementState: row.state,
    settlementDeadlineAt: row.settlementDeadlineAt,
    evidenceExpiresAt: row.evidenceExpiresAt,
    exceptionMarked: row.exceptionMarked,
    deletionInProgress: row.deletionInProgress,
    manuallyDecided: row.manuallyDecided,
  };
}

export class MemoryReviewQueue implements ReviewQueuePort {
  readonly records: ReviewRecord[] = [];

  append(record: ReviewRecord): void {
    this.records.push(record);
  }
}

export class MemoryCandidates implements CandidateProposalPort {
  readonly proposals: CandidateProposal[] = [];

  propose(proposal: CandidateProposal): void {
    this.proposals.push(proposal);
  }
}

export type ModelAnswer = (input: AiBatchInput) => unknown;

/** A model stand-in. Each call records its input, so a test can check what the model was allowed to see. */
export class ScriptedModel implements ReviewModelPort {
  readonly inputs: AiBatchInput[] = [];
  private answer: ModelAnswer = allowAll;
  private failNext = false;

  respondWith(answer: ModelAnswer): void {
    this.answer = answer;
  }

  failNextCall(): void {
    this.failNext = true;
  }

  async reviewBatch(input: AiBatchInput): Promise<unknown> {
    this.inputs.push(input);
    if (this.failNext) {
      this.failNext = false;
      throw new Error("synthetic model outage");
    }
    return this.answer(input);
  }
}

/** Allows every item as a meaningful message, with no candidate terms. */
export function allowAll(input: AiBatchInput): unknown {
  return { items: input.items.map((item) => ({ itemId: item.itemId, verdict: "ALLOW_MEANINGFUL", reasonCodes: ["NONE"], candidateTerms: [] })) };
}

/** Blocks every item for a policy reason. */
export function blockAll(input: AiBatchInput): unknown {
  return { items: input.items.map((item) => ({ itemId: item.itemId, verdict: "BLOCK", reasonCodes: ["HARASSMENT"], candidateTerms: [] })) };
}

/** A synthetic message in the channel. Test data only, never a real viewer. */
export function messageOf(messageId: string, overrides: { readonly channelId?: string; readonly order?: number; readonly senderRef?: string; readonly body?: string } = {}): ChannelEvent {
  return eventOf({
    channelId: overrides.channelId ?? "ch-1",
    platformMessageId: messageId,
    platformOrder: overrides.order ?? 1,
    senderRef: overrides.senderRef ?? "viewer-1",
    body: overrides.body ?? "synthetic text",
  });
}

export const LATER = "2026-11-11T08:00:00.000Z";

export interface HarnessOptions {
  readonly policy?: ReviewRunnerDeps["policy"];
  /** A scoring port to use instead of the real engine, for example one that fails on purpose. */
  readonly scoring?: ScoringPort;
  /** Storage shared with another harness, to model two writers of the same message. */
  readonly store?: MemoryReviewStore;
  readonly ledger?: FakeLedger;
}

/** A complete review fixture: real coordinator and scoring engine, in-memory storage and stand-ins for the model. */
export function reviewHarness(options: HarnessOptions = {}) {
  const h = harnessWith({ limit: 8 });
  const ledger = options.ledger ?? new FakeLedger();
  const scoring = createScoringEngine({ ledger, clock: () => new Date(START) });
  const store = options.store ?? new MemoryReviewStore();
  const reviewQueue = new MemoryReviewQueue();
  const candidates = new MemoryCandidates();
  const model = new ScriptedModel();
  const runner = createReviewRunner({
    store,
    coordinator: h.coordinator,
    model,
    scoring: options.scoring ?? scoring,
    reviewQueue,
    candidates,
    now: () => h.clock.now(),
    newId: sequentialIds("rec"),
    newNonce: sequentialIds("nonce"),
    policy: options.policy ?? { periodMs: 60_000, countThreshold: 50, maxPerCycle: 50 },
  });
  return { h, ledger, store, reviewQueue, candidates, model, runner, scoring };
}
