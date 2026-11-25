PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TEMP TABLE `data_request_items_copy` AS SELECT `id`, `request_id`, `target_kind`, `target_ref`, `item_state`, `error_code`, `attempted_at`, `completed_at` FROM `data_request_items`;--> statement-breakpoint
DROP TABLE `data_request_items`;--> statement-breakpoint
CREATE TABLE `data_request_items` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`target_kind` text NOT NULL,
	`target_ref` text NOT NULL,
	`item_state` text NOT NULL,
	`error_code` text,
	`attempted_at` text,
	`completed_at` text,
	FOREIGN KEY (`request_id`) REFERENCES `data_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_data_request_items_kind" CHECK(target_kind IN ('SUBJECT', 'CHANNEL_EVENT', 'EVENT_PAYMENT', 'TASK', 'VERDICT', 'DELIVERY', 'SUBJECT_IDENTITY', 'SUBJECT_SCORE', 'SCORE_LEDGER', 'SCORE_OUTCOME', 'NICKNAME_CHECK', 'NICKNAME_CHANGE', 'LIST_ENTRY', 'SCORE_EXCEPTION', 'TECHNICAL_LOG', 'TECHNICAL_LOG_EVIDENCE', 'CHANGE_LOG', 'CANDIDATE_CARD', 'CACHE')),
	CONSTRAINT "ck_data_request_items_state" CHECK(item_state IN ('PENDING', 'DONE', 'FAILED'))
);--> statement-breakpoint
INSERT INTO `data_request_items` (`id`, `request_id`, `target_kind`, `target_ref`, `item_state`, `error_code`, `attempted_at`, `completed_at`) SELECT `id`, `request_id`, `target_kind`, `target_ref`, `item_state`, `error_code`, `attempted_at`, `completed_at` FROM `data_request_items_copy`;--> statement-breakpoint
DROP TABLE `data_request_items_copy`;--> statement-breakpoint
CREATE UNIQUE INDEX `data_request_items_target_uq` ON `data_request_items` (`request_id`,`target_kind`,`target_ref`);--> statement-breakpoint
CREATE INDEX `data_request_items_state_idx` ON `data_request_items` (`request_id`,`item_state`);
