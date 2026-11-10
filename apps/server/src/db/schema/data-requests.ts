import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { inList } from "./checks.js";
import { channels } from "./channels.js";
import { subjects } from "./subjects.js";

export const DATA_REQUEST_SOURCES = ["VIEWER_REQUEST", "OPERATOR_INITIATED"] as const;
export const VERIFICATION_STATES = ["PENDING", "VERIFIED", "REJECTED"] as const;
export const DATA_REQUEST_MODES = ["DELETE_DATA_ONLY", "DELETE_AND_EXCEPT"] as const;
export const EXECUTION_STATES = ["PENDING", "RUNNING", "COMPLETED", "PARTIAL_FAILED", "CANCELLED"] as const;
export const DELETION_TARGET_KINDS = [
  "SUBJECT",
  "CHANNEL_EVENT",
  "TASK",
  "VERDICT",
  "DELIVERY",
  "SUBJECT_IDENTITY",
  "SUBJECT_SCORE",
  "SCORE_LEDGER",
  "NICKNAME_CHECK",
  "NICKNAME_CHANGE",
  "LIST_ENTRY",
  "SCORE_EXCEPTION",
  "TECHNICAL_LOG",
  "TECHNICAL_LOG_EVIDENCE",
  "CHANGE_LOG",
] as const;
export const DELETION_ITEM_STATES = ["PENDING", "DONE", "FAILED"] as const;

/** A viewer or operator request. `scope_json` records the deletion scope only, never deleted content. */
export const dataRequests = sqliteTable(
  "data_requests",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id),
    subjectId: text("subject_id").references(() => subjects.id),
    requestSource: text("request_source").notNull(),
    verificationState: text("verification_state").notNull(),
    mode: text("mode").notNull(),
    executionState: text("execution_state").notNull(),
    scopeJson: text("scope_json").notNull(),
    createdAt: text("created_at").notNull(),
    verifiedAt: text("verified_at"),
    completedAt: text("completed_at"),
    updatedAt: text("updated_at").notNull(),
    handledByRef: text("handled_by_ref"),
  },
  (t) => [
    index("data_requests_channel_state_idx").on(t.channelId, t.executionState),
    check("ck_data_requests_source", inList("request_source", DATA_REQUEST_SOURCES)),
    check("ck_data_requests_verification", inList("verification_state", VERIFICATION_STATES)),
    check("ck_data_requests_mode", inList("mode", DATA_REQUEST_MODES)),
    check("ck_data_requests_execution", inList("execution_state", EXECUTION_STATES)),
    check("ck_data_requests_scope_json", sql.raw("json_valid(scope_json)")),
  ],
);

/**
 * One row per deletion target. Partial failures stay visible here, so a retry can resume from the
 * first pending item.
 */
export const dataRequestItems = sqliteTable(
  "data_request_items",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => dataRequests.id),
    targetKind: text("target_kind").notNull(),
    targetRef: text("target_ref").notNull(),
    itemState: text("item_state").notNull(),
    errorCode: text("error_code"),
    attemptedAt: text("attempted_at"),
    completedAt: text("completed_at"),
  },
  (t) => [
    uniqueIndex("data_request_items_target_uq").on(t.requestId, t.targetKind, t.targetRef),
    index("data_request_items_state_idx").on(t.requestId, t.itemState),
    check("ck_data_request_items_kind", inList("target_kind", DELETION_TARGET_KINDS)),
    check("ck_data_request_items_state", inList("item_state", DELETION_ITEM_STATES)),
  ],
);
