import {
  ACTOR_KINDS,
  CHANGE_KINDS,
  CHANGE_OUTCOMES,
  EVIDENCE_KINDS,
  TECHNICAL_DATA_MAX_BYTES,
  TECHNICAL_LEVELS,
  TECHNICAL_STAGES,
  TECHNICAL_STATUSES,
} from "@voxward/contracts";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { channels } from "./channels.js";
import { tasks } from "./messages.js";
import { subjects } from "./subjects.js";

/**
 * Change Log. Records what changed, by whom, and the outcome. It never stores deleted original values or
 * secrets. The summary column is capped at 500 characters.
 */
export const changeLogs = sqliteTable(
  "change_logs",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").references(() => channels.id),
    occurredAt: text("occurred_at").notNull(),
    actorKind: text("actor_kind").notNull(),
    actorRef: text("actor_ref").notNull(),
    changeKind: text("change_kind").notNull(),
    summary: text("summary").notNull(),
    outcome: text("outcome").notNull(),
    correlationId: text("correlation_id"),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [
    index("change_logs_channel_time_idx").on(t.channelId, t.occurredAt),
    index("change_logs_correlation_idx").on(t.correlationId),
    index("change_logs_expires_idx").on(t.expiresAt),
    check("ck_change_logs_actor", inList("actor_kind", ACTOR_KINDS)),
    check("ck_change_logs_kind", inList("change_kind", CHANGE_KINDS)),
    check("ck_change_logs_outcome", inList("outcome", CHANGE_OUTCOMES)),
    check("ck_change_logs_summary", sql.raw("length(summary) <= 500")),
  ],
);

/**
 * Technical Log entry, one per processing step. `id` is the logId and `correlation_id` links the steps of
 * one message or operation. Message text and validated JSON are kept in `technical_log_evidence`.
 */
export const technicalLogs = sqliteTable(
  "technical_logs",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    correlationId: text("correlation_id").notNull(),
    sequence: integer("sequence").notNull(),
    batchId: text("batch_id"),
    taskId: text("task_id").references(() => tasks.id),
    attempt: integer("attempt"),
    level: text("level").notNull().default("INFO"),
    dataJson: text("data_json"),
    stage: text("stage").notNull(),
    status: text("status").notNull(),
    errorCode: text("error_code"),
    providerRef: text("provider_ref"),
    modelRef: text("model_ref"),
    ruleTemplateVersion: text("rule_template_version"),
    latencyMs: integer("latency_ms"),
    subjectId: text("subject_id").references(() => subjects.id),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("technical_logs_chain_sequence_uq").on(t.channelId, t.correlationId, t.sequence),
    index("technical_logs_subject_idx").on(t.subjectId),
    index("technical_logs_task_idx").on(t.taskId),
    index("technical_logs_expires_idx").on(t.expiresAt),
    check("ck_technical_logs_stage", inList("stage", TECHNICAL_STAGES)),
    check("ck_technical_logs_status", inList("status", TECHNICAL_STATUSES)),
    check("ck_technical_logs_level", inList("level", TECHNICAL_LEVELS)),
    check("ck_technical_logs_numbers", sql.raw("sequence >= 0 AND (latency_ms IS NULL OR latency_ms >= 0)")),
    check("ck_technical_logs_attempt", sql.raw("attempt IS NULL OR attempt >= 1")),
    check(
      "ck_technical_logs_data",
      sql.raw(
        `data_json IS NULL OR (json_valid(data_json) AND length(CAST(data_json AS BLOB)) <= ${TECHNICAL_DATA_MAX_BYTES})`,
      ),
    ),
  ],
);

/**
 * The only table with message content: message text, translations, the temporary itemId map and validated
 * JSON. It has its own expiry, so content can be removed without touching the metadata rows.
 */
export const technicalLogEvidence = sqliteTable(
  "technical_log_evidence",
  {
    id: text("id").primaryKey(),
    logId: text("log_id")
      .notNull()
      .references(() => technicalLogs.id, { onDelete: "cascade" }),
    evidenceKind: text("evidence_kind").notNull(),
    payload: text("payload").notNull(),
    payloadBytes: integer("payload_bytes").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (t) => [
    index("technical_log_evidence_log_idx").on(t.logId),
    index("technical_log_evidence_expires_idx").on(t.expiresAt),
    check("ck_technical_log_evidence_kind", inList("evidence_kind", EVIDENCE_KINDS)),
    check("ck_technical_log_evidence_bytes", sql.raw("payload_bytes = length(CAST(payload AS BLOB))")),
    check(
      "ck_technical_log_evidence_json",
      sql.raw("evidence_kind <> 'VALIDATED_JSON' OR json_valid(payload)"),
    ),
  ],
);
