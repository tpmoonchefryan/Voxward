import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { channels } from "./channels.js";

export const IDENTITY_KINDS = ["CHANNEL_OWNER", "MODERATOR", "PAID_MEMBER", "VERIFIED_ACCOUNT", "UNKNOWN"] as const;
export const SCORE_REASON_CODES = [
  "COMPLIANT_REWARD",
  "RULE_PENALTY",
  "IDENTITY_BASE_CHANGE",
  "MANUAL_CORRECTION",
] as const;
export const NICKNAME_CHECK_RESULTS = ["PASS", "BLOCK", "NEEDS_REVIEW"] as const;

export type ScoreReasonCode = (typeof SCORE_REASON_CODES)[number];

/**
 * An audience member inside one channel. `platform_subject_key` is derived by the server and is not the
 * platform user ID. `processing_generation` rises on deletion or regeneration, which stales older tasks.
 */
export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    platformSubjectKey: text("platform_subject_key").notNull(),
    processingGeneration: integer("processing_generation").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("subjects_channel_key_uq").on(t.channelId, t.platformSubjectKey),
    check("ck_subjects_generation", sql.raw("processing_generation >= 0")),
  ],
);

/** Platform-verified identity facts. `source_event_ref` makes each identity event apply once. */
export const subjectIdentities = sqliteTable(
  "subject_identities",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    identityKind: text("identity_kind").notNull(),
    sourceEventRef: text("source_event_ref").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    observedAt: text("observed_at").notNull(),
  },
  (t) => [
    uniqueIndex("subject_identities_source_uq").on(t.sourceEventRef),
    index("subject_identities_subject_idx").on(t.subjectId),
    check("ck_subject_identities_kind", inList("identity_kind", IDENTITY_KINDS)),
  ],
);

/** Current score of one subject. `version` supports compare-and-set updates. */
export const subjectScores = sqliteTable(
  "subject_scores",
  {
    subjectId: text("subject_id")
      .primaryKey()
      .references(() => subjects.id),
    identityBaseScore: integer("identity_base_score").notNull().default(0),
    behaviorAdjustTotal: integer("behavior_adjust_total").notNull().default(0),
    currentScore: integer("current_score").notNull(),
    version: integer("version").notNull().default(0),
    lastRewardAt: text("last_reward_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [check("ck_subject_scores_version", sql.raw("version >= 0"))],
);

/**
 * Score ledger. `idempotency_key` is unique, so one verdict or event changes a score once.
 * `verdict_ref` is a logical reference without a foreign key: keeping it out of the subjects module avoids
 * a file-level import cycle, and the idempotency key already guarantees one entry per verdict.
 */
export const scoreLedger = sqliteTable(
  "score_ledger",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    idempotencyKey: text("idempotency_key").notNull(),
    reasonCode: text("reason_code").notNull(),
    requestedDelta: integer("requested_delta").notNull(),
    actualDelta: integer("actual_delta").notNull(),
    ruleVersion: integer("rule_version"),
    verdictRef: text("verdict_ref"),
    correlationId: text("correlation_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("score_ledger_idempotency_uq").on(t.idempotencyKey),
    index("score_ledger_subject_idx").on(t.subjectId, t.createdAt),
    check("ck_score_ledger_reason", inList("reason_code", SCORE_REASON_CODES)),
  ],
);

/** Cached nickname check. The row holds only a SHA-256 hex digest of the nickname, never the nickname. */
export const subjectNicknameChecks = sqliteTable(
  "subject_nickname_checks",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    nicknameHash: text("nickname_hash").notNull(),
    ruleVersion: integer("rule_version").notNull(),
    result: text("result").notNull(),
    checkedAt: text("checked_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    invalidatedAt: text("invalidated_at"),
  },
  (t) => [
    uniqueIndex("subject_nickname_checks_uq").on(t.subjectId, t.nicknameHash, t.ruleVersion),
    check("ck_subject_nickname_checks_hash", sql.raw("length(nickname_hash) = 64")),
    check("ck_subject_nickname_checks_result", inList("result", NICKNAME_CHECK_RESULTS)),
  ],
);

/** Nickname change history, stored as digests. The data-deletion index covers these rows. */
export const subjectNicknameChanges = sqliteTable(
  "subject_nickname_changes",
  {
    id: text("id").primaryKey(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    previousNicknameHash: text("previous_nickname_hash"),
    nextNicknameHash: text("next_nickname_hash").notNull(),
    changedAt: text("changed_at").notNull(),
  },
  (t) => [
    index("subject_nickname_changes_subject_idx").on(t.subjectId),
    check(
      "ck_subject_nickname_changes_hash",
      sql.raw(
        "length(next_nickname_hash) = 64 AND (previous_nickname_hash IS NULL OR length(previous_nickname_hash) = 64)",
      ),
    ),
  ],
);
