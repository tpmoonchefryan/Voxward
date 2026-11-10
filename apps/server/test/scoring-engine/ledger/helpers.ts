import type { VoxwardDatabase } from "../../../src/db/client.js";
import { ScoreExceptionStore, SubjectStore } from "../../../src/db/repository.js";
import { channels } from "../../../src/db/schema/index.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import type { ScoringConfigOverrides } from "../../../src/modules/scoring-engine/index.js";

export const T0 = "2026-11-10T10:00:00.000Z";

/** Synthetic configuration for the ledger tests. The numbers are test values, not product values. */
export const ENABLED: ScoringConfigOverrides = {
  enabled: true,
  minScore: -10,
  maxScore: 10,
  complianceReward: 2,
  violationPenalty: 3,
  rewardCooldownMs: 0,
  identityBaseScores: { CHANNEL_OWNER: 0, MODERATOR: 0, PAID_MEMBER: 10, VERIFIED_ACCOUNT: 0, UNKNOWN: 0 },
};

export function seedChannels(database: VoxwardDatabase, ids: readonly string[]): void {
  runShortTransaction(database, (tx) => {
    for (const id of ids) {
      tx.insert(channels)
        .values({ id, platform: "youtube", platformChannelRef: `UC-${id}`, displayName: id, createdAt: T0, updatedAt: T0 })
        .run();
    }
  });
}

/** Creates the subject ahead of time and puts an active scoring-exception marker on it. */
export function seedException(database: VoxwardDatabase, channelId: string, subjectKey: string): void {
  runShortTransaction(database, (tx) => {
    const subjectId = `excepted-${channelId}-${subjectKey}`;
    SubjectStore.create(tx, { id: subjectId, channelId, platformSubjectKey: subjectKey, createdAt: T0 });
    ScoreExceptionStore.ensureActive(tx, {
      id: `exception-${subjectId}`,
      channelId,
      subjectId,
      sourceRequestId: null,
      createdAt: T0,
    });
  });
}

export interface ScoreRow {
  readonly current: number;
  readonly behavior: number;
  readonly identity: number;
  readonly version: number;
  readonly lastRewardAt: string | null;
}

export function scoreOf(database: VoxwardDatabase, channelId: string, subjectKey: string): ScoreRow | undefined {
  return database.sqlite
    .prepare(
      `select s.current_score as current, s.behavior_adjust_total as behavior, s.identity_base_score as identity,
              s.version as version, s.last_reward_at as lastRewardAt
         from subject_scores s join subjects j on j.id = s.subject_id
        where j.channel_id = ? and j.platform_subject_key = ?`,
    )
    .get(channelId, subjectKey) as ScoreRow | undefined;
}

export interface LedgerRow {
  readonly reason_code: string;
  readonly requested_delta: number;
  readonly actual_delta: number;
  readonly idempotency_key: string;
}

export function ledgerRows(database: VoxwardDatabase, channelId: string, subjectKey: string): LedgerRow[] {
  return database.sqlite
    .prepare(
      `select l.reason_code, l.requested_delta, l.actual_delta, l.idempotency_key
         from score_ledger l join subjects j on j.id = l.subject_id
        where j.channel_id = ? and j.platform_subject_key = ?
        order by l.rowid`,
    )
    .all(channelId, subjectKey) as LedgerRow[];
}

export interface IdentityRow {
  readonly kind: string;
  readonly sourceEventRef: string;
  readonly effectiveTo: string | null;
}

export function identityRows(database: VoxwardDatabase): IdentityRow[] {
  return database.sqlite
    .prepare(
      `select identity_kind as kind, source_event_ref as sourceEventRef, effective_to as effectiveTo
         from subject_identities order by rowid`,
    )
    .all() as IdentityRow[];
}
