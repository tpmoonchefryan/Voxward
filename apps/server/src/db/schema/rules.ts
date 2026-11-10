import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { channels } from "./channels.js";
import { dataRequests } from "./data-requests.js";
import { subjects } from "./subjects.js";

export const TERM_MATCH_KINDS = ["EXACT", "NORMALIZED", "CROSS_LANGUAGE_PHONETIC", "CONSTRAINED_REGEX"] as const;
export const LIST_KINDS = ["BLACKLIST", "WHITELIST"] as const;
export const SCORING_EXCEPTION_PURPOSES = ["SCORING_EXCEPTION_PREFERENCE"] as const;

/** Versioned rule set of one channel. A published version is never edited in place. */
export const ruleVersions = sqliteTable(
  "rule_versions",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    version: integer("version").notNull(),
    ruleJson: text("rule_json").notNull(),
    createdAt: text("created_at").notNull(),
    createdByRef: text("created_by_ref").notNull(),
  },
  (t) => [
    uniqueIndex("rule_versions_channel_version_uq").on(t.channelId, t.version),
    check("ck_rule_versions_version", sql.raw("version >= 1")),
    check("ck_rule_versions_json", sql.raw("json_valid(rule_json)")),
  ],
);

/** Word-list entry. Retired entries keep their row, and one active entry per match kind, language and term. */
export const ruleTerms = sqliteTable(
  "rule_terms",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    term: text("term").notNull(),
    matchKind: text("match_kind").notNull(),
    language: text("language").notNull(),
    groupCode: text("group_code").notNull(),
    createdAt: text("created_at").notNull(),
    createdByRef: text("created_by_ref").notNull(),
    retiredAt: text("retired_at"),
  },
  (t) => [
    uniqueIndex("rule_terms_active_uq")
      .on(t.channelId, t.matchKind, t.language, t.term)
      .where(sql.raw("retired_at IS NULL")),
    check("ck_rule_terms_match_kind", inList("match_kind", TERM_MATCH_KINDS)),
  ],
);

/** Channel-scoped blacklist or whitelist entry for one subject. Custom rule: one active entry per subject. */
export const listEntries = sqliteTable(
  "list_entries",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    listKind: text("list_kind").notNull(),
    createdAt: text("created_at").notNull(),
    createdByRef: text("created_by_ref").notNull(),
    removedAt: text("removed_at"),
  },
  (t) => [
    uniqueIndex("list_entries_active_uq")
      .on(t.channelId, t.subjectId)
      .where(sql.raw("removed_at IS NULL")),
    check("ck_list_entries_kind", inList("list_kind", LIST_KINDS)),
  ],
);

/**
 * Scoring-exception marker. It is independent of the blacklist. At most one active marker per subject,
 * so a repeated "delete and except" request adds no second row.
 */
export const scoreExceptions = sqliteTable(
  "score_exceptions",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    sourceRequestId: text("source_request_id").references(() => dataRequests.id),
    purposeCode: text("purpose_code").notNull(),
    createdAt: text("created_at").notNull(),
    removedAt: text("removed_at"),
    removedReasonCode: text("removed_reason_code"),
  },
  (t) => [
    uniqueIndex("score_exceptions_active_uq")
      .on(t.channelId, t.subjectId)
      .where(sql.raw("removed_at IS NULL")),
    check("ck_score_exceptions_purpose", inList("purpose_code", SCORING_EXCEPTION_PURPOSES)),
  ],
);
