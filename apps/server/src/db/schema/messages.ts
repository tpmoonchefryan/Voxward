import { DOWNSTREAM_VERDICTS, INTERNAL_CLASSIFICATIONS, TASK_STATUSES } from "@voxward/contracts";
import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { flag, inList } from "./checks.js";
import { channels, outputGrants } from "./channels.js";
import { subjects } from "./subjects.js";

export const SETTLEMENT_STATES = ["NONE", "UNSETTLED_FAST_PASS", "SETTLED", "UNSETTLED_EXPIRED"] as const;
export const TASK_KINDS = ["REALTIME_REVIEW", "PAID_TEXT_REVIEW", "SETTLEMENT_REVIEW"] as const;
export const VERDICT_SOURCES = ["BASE_RULE", "MODEL", "FAST_PASS", "MANUAL"] as const;
export const DELIVERY_STATUSES = ["PENDING", "SENT", "FAILED", "EXPIRED", "CANCELLED"] as const;

export type TaskKind = (typeof TASK_KINDS)[number];
export type VerdictSource = (typeof VERDICT_SOURCES)[number];

/**
 * Internal event reference. This table holds no message text (proposal §10). The text lives only in
 * `technical_log_evidence`, which has its own retention.
 */
export const channelEvents = sqliteTable(
  "channel_events",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    platformMessageRef: text("platform_message_ref").notNull(),
    platformOrder: integer("platform_order").notNull(),
    receivedAt: text("received_at").notNull(),
    correlationId: text("correlation_id").notNull(),
    eventVersion: integer("event_version").notNull().default(1),
    settlementState: text("settlement_state").notNull().default("NONE"),
    settlementDeadlineAt: text("settlement_deadline_at"),
    exceptionMarked: integer("exception_marked").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("channel_events_dedupe_uq").on(t.channelId, t.platformMessageRef),
    uniqueIndex("channel_events_correlation_uq").on(t.correlationId),
    index("channel_events_order_idx").on(t.channelId, t.platformOrder),
    index("channel_events_settlement_idx").on(t.settlementState, t.settlementDeadlineAt),
    check("ck_channel_events_version", sql.raw("event_version >= 1")),
    check("ck_channel_events_settlement", inList("settlement_state", SETTLEMENT_STATES)),
    check("ck_channel_events_exception", flag("exception_marked")),
  ],
);

/** Structured paid-message payment metadata separated from log payloads and text. */
export const eventPayments = sqliteTable(
  "event_payments",
  {
    eventId: text("event_id")
      .primaryKey()
      .references(() => channelEvents.id),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    amountMicros: integer("amount_micros").notNull(),
    currency: text("currency").notNull(),
    amountDisplay: text("amount_display"),
    tier: integer("tier"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("event_payments_channel_created_idx").on(t.channelId, t.createdAt),
    check("ck_event_payments_amount_micros", sql.raw("amount_micros >= 0")),
    check("ck_event_payments_currency", sql.raw("length(currency) BETWEEN 3 AND 8")),
    check("ck_event_payments_tier", sql.raw("tier IS NULL OR tier BETWEEN 1 AND 7")),
  ],
);

/** Processing task bound to one event version and one processing generation (proposal §7.2). */
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => channelEvents.id),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    kind: text("kind").notNull(),
    status: text("status").notNull(),
    eventVersion: integer("event_version").notNull(),
    processingGeneration: integer("processing_generation").notNull(),
    deadlineAt: text("deadline_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("tasks_event_kind_version_uq").on(t.eventId, t.kind, t.eventVersion),
    index("tasks_status_deadline_idx").on(t.status, t.deadlineAt),
    check("ck_tasks_kind", inList("kind", TASK_KINDS)),
    check("ck_tasks_status", inList("status", TASK_STATUSES)),
    check("ck_tasks_versions", sql.raw("event_version >= 1 AND processing_generation >= 0")),
  ],
);

/**
 * Final verdict of an event. The CHECK ties the internal classification to its downstream verdict, and
 * the partial unique index allows only one current verdict per event.
 */
export const verdicts = sqliteTable(
  "verdicts",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => channelEvents.id),
    taskId: text("task_id").references(() => tasks.id),
    seq: integer("seq").notNull(),
    classification: text("classification").notNull(),
    downstream: text("downstream").notNull(),
    source: text("source").notNull(),
    isCurrent: integer("is_current").notNull().default(1),
    decidedAt: text("decided_at").notNull(),
    decidedByRef: text("decided_by_ref").notNull(),
  },
  (t) => [
    uniqueIndex("verdicts_event_seq_uq").on(t.eventId, t.seq),
    uniqueIndex("verdicts_event_current_uq")
      .on(t.eventId)
      .where(sql.raw("is_current = 1")),
    check("ck_verdicts_seq", sql.raw("seq >= 1")),
    check("ck_verdicts_classification", inList("classification", INTERNAL_CLASSIFICATIONS)),
    check("ck_verdicts_downstream", inList("downstream", DOWNSTREAM_VERDICTS)),
    check(
      "ck_verdicts_consistent",
      sql.raw(
        "(classification = 'BLOCK' AND downstream = 'BLOCK') OR (classification <> 'BLOCK' AND downstream = 'ALLOW')",
      ),
    ),
    check("ck_verdicts_source", inList("source", VERDICT_SOURCES)),
    check("ck_verdicts_current", flag("is_current")),
  ],
);

/** Delivery intent and status of one verdict to one output endpoint, in delivery order. */
export const deliveries = sqliteTable(
  "deliveries",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => channelEvents.id),
    verdictId: text("verdict_id")
      .notNull()
      .references(() => verdicts.id),
    outputGrantId: text("output_grant_id").references(() => outputGrants.id),
    deliverySequence: integer("delivery_sequence").notNull(),
    platformOrder: integer("platform_order").notNull(),
    validUntil: text("valid_until").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("deliveries_event_sequence_uq").on(t.eventId, t.deliverySequence),
    index("deliveries_status_valid_idx").on(t.status, t.validUntil),
    check("ck_deliveries_status", inList("status", DELIVERY_STATUSES)),
    check("ck_deliveries_counters", sql.raw("delivery_sequence >= 1 AND attempts >= 0")),
  ],
);
