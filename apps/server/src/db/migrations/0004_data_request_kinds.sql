PRAGMA defer_foreign_keys = ON;--> statement-breakpoint
CREATE TEMP TABLE `data_requests_copy` AS SELECT `id`, `channel_id`, `subject_id`, `request_source`, `verification_state`, `mode`, `execution_state`, `scope_json`, `created_at`, `verified_at`, `completed_at`, `updated_at`, `handled_by_ref` FROM `data_requests`;--> statement-breakpoint
DROP TABLE `data_requests`;--> statement-breakpoint
CREATE TABLE `data_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`subject_id` text,
	`request_kind` text NOT NULL,
	`request_source` text NOT NULL,
	`verification_state` text NOT NULL,
	`verification_method` text,
	`mode` text,
	`execution_state` text NOT NULL,
	`scope_json` text NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text,
	`completed_at` text,
	`updated_at` text NOT NULL,
	`handled_by_ref` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_data_requests_kind" CHECK(request_kind IN ('ACCESS', 'CORRECTION', 'DELETE', 'STOP_SCORING')),
	CONSTRAINT "ck_data_requests_source" CHECK(request_source IN ('VIEWER_REQUEST', 'OPERATOR_INITIATED')),
	CONSTRAINT "ck_data_requests_verification" CHECK(verification_state IN ('PENDING', 'VERIFIED', 'REJECTED')),
	CONSTRAINT "ck_data_requests_method" CHECK(verification_method IS NULL OR verification_method IN ('ACCOUNT_OWNERSHIP', 'REQUEST_AUTHORIZATION')),
	CONSTRAINT "ck_data_requests_verified_method" CHECK(verification_state <> 'VERIFIED' OR verification_method IS NOT NULL),
	CONSTRAINT "ck_data_requests_mode" CHECK(mode IS NULL OR mode IN ('DELETE_DATA_ONLY', 'DELETE_AND_EXCEPT')),
	CONSTRAINT "ck_data_requests_mode_kind" CHECK((request_kind = 'DELETE') = (mode IS NOT NULL)),
	CONSTRAINT "ck_data_requests_execution" CHECK(execution_state IN ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL_FAILED', 'CANCELLED')),
	CONSTRAINT "ck_data_requests_scope_json" CHECK(json_valid(scope_json))
);--> statement-breakpoint
INSERT INTO `data_requests` (`id`, `channel_id`, `subject_id`, `request_kind`, `request_source`, `verification_state`, `verification_method`, `mode`, `execution_state`, `scope_json`, `created_at`, `verified_at`, `completed_at`, `updated_at`, `handled_by_ref`) SELECT `id`, `channel_id`, `subject_id`, 'DELETE', `request_source`, `verification_state`, NULL, `mode`, `execution_state`, `scope_json`, `created_at`, `verified_at`, `completed_at`, `updated_at`, `handled_by_ref` FROM `data_requests_copy`;--> statement-breakpoint
DROP TABLE `data_requests_copy`;--> statement-breakpoint
CREATE INDEX `data_requests_channel_state_idx` ON `data_requests` (`channel_id`,`execution_state`);--> statement-breakpoint
CREATE INDEX `data_requests_subject_idx` ON `data_requests` (`channel_id`,`subject_id`);
