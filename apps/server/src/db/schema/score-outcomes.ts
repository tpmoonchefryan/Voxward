import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { subjects } from "./subjects.js";

export const SCORE_OUTCOME_KINDS = ["NO_EFFECT", "REFUSED"] as const;

/**
 * Idempotency record for a scoring request that changed no score. `NO_EFFECT` covers a cooldown, noise, a zero or fully
 * clamped change and a disabled scoring module. `REFUSED` covers a subject on the scoring-exception list. A repeated
 * key returns `duplicate`, so a retry cannot score the same event later, after the cooldown or the exception has changed.
 */
export const scoreOutcomes = sqliteTable("score_outcomes", {
  idempotencyKey: text("idempotency_key").primaryKey(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id),
  outcome: text("outcome").notNull(),
  reasonCode: text("reason_code").notNull(),
  createdAt: text("created_at").notNull(),
}, (t) => [check("ck_score_outcomes_kind", inList("outcome", SCORE_OUTCOME_KINDS))]);
