CREATE TABLE `channel_members` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`account_ref` text NOT NULL,
	`role` text NOT NULL,
	`log_access` integer DEFAULT 0 NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_members_role" CHECK(role IN ('CHANNEL_OWNER', 'MODERATOR', 'DATA_ADMIN')),
	CONSTRAINT "ck_channel_members_log_access" CHECK(log_access IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_members_active_uq` ON `channel_members` (`channel_id`,`account_ref`) WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`platform_channel_ref` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_platform_ref_uq` ON `channels` (`platform`,`platform_channel_ref`);--> statement-breakpoint
CREATE TABLE `credential_refs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text,
	`purpose` text NOT NULL,
	`secret_ref` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_credential_refs_purpose" CHECK(purpose IN ('PLATFORM_OAUTH', 'PLATFORM_PROJECT_KEY', 'MODEL_ACCESS', 'OUTPUT_GRANT')),
	CONSTRAINT "ck_credential_refs_secret_ref" CHECK(secret_ref GLOB 'secretref:*' AND length(secret_ref) BETWEEN 18 AND 74 AND secret_ref NOT GLOB '*[^A-Za-z0-9_:-]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credential_refs_secret_ref_uq` ON `credential_refs` (`secret_ref`);--> statement-breakpoint
CREATE INDEX `credential_refs_channel_idx` ON `credential_refs` (`channel_id`);--> statement-breakpoint
CREATE TABLE `deployment_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "ck_deployment_settings_json" CHECK(json_valid(value_json))
);
--> statement-breakpoint
CREATE TABLE `output_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`output_kind` text NOT NULL,
	`credential_ref_id` text NOT NULL,
	`scope` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`credential_ref_id`) REFERENCES `credential_refs`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_output_grants_scope" CHECK(scope IN ('ROOM_READ_ONLY'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `output_grants_credential_uq` ON `output_grants` (`credential_ref_id`);--> statement-breakpoint
CREATE INDEX `output_grants_channel_idx` ON `output_grants` (`channel_id`);--> statement-breakpoint
CREATE TABLE `score_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`reason_code` text NOT NULL,
	`requested_delta` integer NOT NULL,
	`actual_delta` integer NOT NULL,
	`rule_version` integer,
	`verdict_ref` text,
	`correlation_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_score_ledger_reason" CHECK(reason_code IN ('COMPLIANT_REWARD', 'RULE_PENALTY', 'IDENTITY_BASE_CHANGE', 'MANUAL_CORRECTION'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_ledger_idempotency_uq` ON `score_ledger` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `score_ledger_subject_idx` ON `score_ledger` (`subject_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `subject_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`identity_kind` text NOT NULL,
	`source_event_ref` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_subject_identities_kind" CHECK(identity_kind IN ('CHANNEL_OWNER', 'MODERATOR', 'PAID_MEMBER', 'VERIFIED_ACCOUNT', 'UNKNOWN'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_identities_source_uq` ON `subject_identities` (`source_event_ref`);--> statement-breakpoint
CREATE INDEX `subject_identities_subject_idx` ON `subject_identities` (`subject_id`);--> statement-breakpoint
CREATE TABLE `subject_nickname_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`previous_nickname_hash` text,
	`next_nickname_hash` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_subject_nickname_changes_hash" CHECK(length(next_nickname_hash) = 64 AND (previous_nickname_hash IS NULL OR length(previous_nickname_hash) = 64))
);
--> statement-breakpoint
CREATE INDEX `subject_nickname_changes_subject_idx` ON `subject_nickname_changes` (`subject_id`);--> statement-breakpoint
CREATE TABLE `subject_nickname_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`nickname_hash` text NOT NULL,
	`rule_version` integer NOT NULL,
	`result` text NOT NULL,
	`checked_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`invalidated_at` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_subject_nickname_checks_hash" CHECK(length(nickname_hash) = 64),
	CONSTRAINT "ck_subject_nickname_checks_result" CHECK(result IN ('PASS', 'BLOCK', 'NEEDS_REVIEW'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subject_nickname_checks_uq` ON `subject_nickname_checks` (`subject_id`,`nickname_hash`,`rule_version`);--> statement-breakpoint
CREATE TABLE `subject_scores` (
	`subject_id` text PRIMARY KEY NOT NULL,
	`identity_base_score` integer DEFAULT 0 NOT NULL,
	`behavior_adjust_total` integer DEFAULT 0 NOT NULL,
	`current_score` integer NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`last_reward_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_subject_scores_version" CHECK(version >= 0)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`platform_subject_key` text NOT NULL,
	`processing_generation` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_subjects_generation" CHECK(processing_generation >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_channel_key_uq` ON `subjects` (`channel_id`,`platform_subject_key`);--> statement-breakpoint
CREATE TABLE `list_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`list_kind` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	`removed_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_list_entries_kind" CHECK(list_kind IN ('BLACKLIST', 'WHITELIST'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `list_entries_active_uq` ON `list_entries` (`channel_id`,`subject_id`) WHERE removed_at IS NULL;--> statement-breakpoint
CREATE TABLE `rule_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`term` text NOT NULL,
	`match_kind` text NOT NULL,
	`language` text NOT NULL,
	`group_code` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	`retired_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_rule_terms_match_kind" CHECK(match_kind IN ('EXACT', 'NORMALIZED', 'CROSS_LANGUAGE_PHONETIC', 'CONSTRAINED_REGEX'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rule_terms_active_uq` ON `rule_terms` (`channel_id`,`match_kind`,`language`,`term`) WHERE retired_at IS NULL;--> statement-breakpoint
CREATE TABLE `rule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`version` integer NOT NULL,
	`rule_json` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_rule_versions_version" CHECK(version >= 1),
	CONSTRAINT "ck_rule_versions_json" CHECK(json_valid(rule_json))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rule_versions_channel_version_uq` ON `rule_versions` (`channel_id`,`version`);--> statement-breakpoint
CREATE TABLE `score_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`source_request_id` text,
	`purpose_code` text NOT NULL,
	`created_at` text NOT NULL,
	`removed_at` text,
	`removed_reason_code` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_request_id`) REFERENCES `data_requests`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_score_exceptions_purpose" CHECK(purpose_code IN ('SCORING_EXCEPTION_PREFERENCE'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `score_exceptions_active_uq` ON `score_exceptions` (`channel_id`,`subject_id`) WHERE removed_at IS NULL;--> statement-breakpoint
CREATE TABLE `channel_events` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`platform_message_ref` text NOT NULL,
	`platform_order` integer NOT NULL,
	`received_at` text NOT NULL,
	`correlation_id` text NOT NULL,
	`event_version` integer DEFAULT 1 NOT NULL,
	`settlement_state` text DEFAULT 'NONE' NOT NULL,
	`settlement_deadline_at` text,
	`exception_marked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_events_version" CHECK(event_version >= 1),
	CONSTRAINT "ck_channel_events_settlement" CHECK(settlement_state IN ('NONE', 'UNSETTLED_FAST_PASS', 'SETTLED', 'UNSETTLED_EXPIRED')),
	CONSTRAINT "ck_channel_events_exception" CHECK(exception_marked IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channel_events_dedupe_uq` ON `channel_events` (`channel_id`,`platform_message_ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `channel_events_correlation_uq` ON `channel_events` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `channel_events_order_idx` ON `channel_events` (`channel_id`,`platform_order`);--> statement-breakpoint
CREATE INDEX `channel_events_settlement_idx` ON `channel_events` (`settlement_state`,`settlement_deadline_at`);--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`verdict_id` text NOT NULL,
	`output_grant_id` text,
	`delivery_sequence` integer NOT NULL,
	`platform_order` integer NOT NULL,
	`valid_until` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `channel_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verdict_id`) REFERENCES `verdicts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`output_grant_id`) REFERENCES `output_grants`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_deliveries_status" CHECK(status IN ('PENDING', 'SENT', 'FAILED', 'EXPIRED', 'CANCELLED')),
	CONSTRAINT "ck_deliveries_counters" CHECK(delivery_sequence >= 1 AND attempts >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deliveries_event_sequence_uq` ON `deliveries` (`event_id`,`delivery_sequence`);--> statement-breakpoint
CREATE INDEX `deliveries_status_valid_idx` ON `deliveries` (`status`,`valid_until`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`event_version` integer NOT NULL,
	`processing_generation` integer NOT NULL,
	`deadline_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `channel_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_tasks_kind" CHECK(kind IN ('REALTIME_REVIEW', 'PAID_TEXT_REVIEW', 'SETTLEMENT_REVIEW')),
	CONSTRAINT "ck_tasks_status" CHECK(status IN ('QUEUED', 'RUNNING', 'PENDING_REVIEW', 'DONE', 'DISCARDED')),
	CONSTRAINT "ck_tasks_versions" CHECK(event_version >= 1 AND processing_generation >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_event_kind_version_uq` ON `tasks` (`event_id`,`kind`,`event_version`);--> statement-breakpoint
CREATE INDEX `tasks_status_deadline_idx` ON `tasks` (`status`,`deadline_at`);--> statement-breakpoint
CREATE TABLE `verdicts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`task_id` text,
	`seq` integer NOT NULL,
	`classification` text NOT NULL,
	`downstream` text NOT NULL,
	`source` text NOT NULL,
	`is_current` integer DEFAULT 1 NOT NULL,
	`decided_at` text NOT NULL,
	`decided_by_ref` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `channel_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_verdicts_seq" CHECK(seq >= 1),
	CONSTRAINT "ck_verdicts_classification" CHECK(classification IN ('ALLOW_MEANINGFUL', 'ALLOW_NOISE', 'BLOCK')),
	CONSTRAINT "ck_verdicts_downstream" CHECK(downstream IN ('ALLOW', 'BLOCK')),
	CONSTRAINT "ck_verdicts_consistent" CHECK((classification = 'BLOCK' AND downstream = 'BLOCK') OR (classification <> 'BLOCK' AND downstream = 'ALLOW')),
	CONSTRAINT "ck_verdicts_source" CHECK(source IN ('BASE_RULE', 'MODEL', 'FAST_PASS', 'MANUAL')),
	CONSTRAINT "ck_verdicts_current" CHECK(is_current IN (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verdicts_event_seq_uq` ON `verdicts` (`event_id`,`seq`);--> statement-breakpoint
CREATE UNIQUE INDEX `verdicts_event_current_uq` ON `verdicts` (`event_id`) WHERE is_current = 1;--> statement-breakpoint
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
	CONSTRAINT "ck_data_request_items_kind" CHECK(target_kind IN ('SUBJECT', 'CHANNEL_EVENT', 'TASK', 'VERDICT', 'DELIVERY', 'SUBJECT_IDENTITY', 'SUBJECT_SCORE', 'SCORE_LEDGER', 'NICKNAME_CHECK', 'NICKNAME_CHANGE', 'LIST_ENTRY', 'SCORE_EXCEPTION', 'TECHNICAL_LOG', 'TECHNICAL_LOG_EVIDENCE', 'CHANGE_LOG')),
	CONSTRAINT "ck_data_request_items_state" CHECK(item_state IN ('PENDING', 'DONE', 'FAILED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_request_items_target_uq` ON `data_request_items` (`request_id`,`target_kind`,`target_ref`);--> statement-breakpoint
CREATE INDEX `data_request_items_state_idx` ON `data_request_items` (`request_id`,`item_state`);--> statement-breakpoint
CREATE TABLE `data_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`subject_id` text,
	`request_source` text NOT NULL,
	`verification_state` text NOT NULL,
	`mode` text NOT NULL,
	`execution_state` text NOT NULL,
	`scope_json` text NOT NULL,
	`created_at` text NOT NULL,
	`verified_at` text,
	`completed_at` text,
	`updated_at` text NOT NULL,
	`handled_by_ref` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_data_requests_source" CHECK(request_source IN ('VIEWER_REQUEST', 'OPERATOR_INITIATED')),
	CONSTRAINT "ck_data_requests_verification" CHECK(verification_state IN ('PENDING', 'VERIFIED', 'REJECTED')),
	CONSTRAINT "ck_data_requests_mode" CHECK(mode IN ('DELETE_DATA_ONLY', 'DELETE_AND_EXCEPT')),
	CONSTRAINT "ck_data_requests_execution" CHECK(execution_state IN ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL_FAILED', 'CANCELLED')),
	CONSTRAINT "ck_data_requests_scope_json" CHECK(json_valid(scope_json))
);
--> statement-breakpoint
CREATE INDEX `data_requests_channel_state_idx` ON `data_requests` (`channel_id`,`execution_state`);--> statement-breakpoint
CREATE TABLE `change_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text,
	`occurred_at` text NOT NULL,
	`actor_kind` text NOT NULL,
	`actor_ref` text NOT NULL,
	`change_kind` text NOT NULL,
	`summary` text NOT NULL,
	`outcome` text NOT NULL,
	`correlation_id` text,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_change_logs_actor" CHECK(actor_kind IN ('ACCOUNT', 'SYSTEM', 'DEPLOYMENT_ADMIN')),
	CONSTRAINT "ck_change_logs_kind" CHECK(change_kind IN ('CONFIG_CHANGED', 'MEMBER_GRANTED', 'MEMBER_REVOKED', 'CREDENTIAL_CHANGED', 'OUTPUT_GRANT_CHANGED', 'LIST_CHANGED', 'TERM_CHANGED', 'RULE_VERSION_PUBLISHED', 'MANUAL_VERDICT', 'SCORE_CHANGED', 'SCORE_EXCEPTION_CHANGED', 'DATA_REQUEST_CHANGED')),
	CONSTRAINT "ck_change_logs_outcome" CHECK(outcome IN ('SUCCEEDED', 'FAILED', 'PARTIAL')),
	CONSTRAINT "ck_change_logs_summary" CHECK(length(summary) <= 500)
);
--> statement-breakpoint
CREATE INDEX `change_logs_channel_time_idx` ON `change_logs` (`channel_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `change_logs_correlation_idx` ON `change_logs` (`correlation_id`);--> statement-breakpoint
CREATE INDEX `change_logs_expires_idx` ON `change_logs` (`expires_at`);--> statement-breakpoint
CREATE TABLE `technical_log_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`log_id` text NOT NULL,
	`evidence_kind` text NOT NULL,
	`payload` text NOT NULL,
	`payload_bytes` integer NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`log_id`) REFERENCES `technical_logs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_technical_log_evidence_kind" CHECK(evidence_kind IN ('MESSAGE_TEXT', 'TRANSLATION', 'ITEM_ID_MAP', 'VALIDATED_JSON')),
	CONSTRAINT "ck_technical_log_evidence_bytes" CHECK(payload_bytes = length(CAST(payload AS BLOB))),
	CONSTRAINT "ck_technical_log_evidence_json" CHECK(evidence_kind <> 'VALIDATED_JSON' OR json_valid(payload))
);
--> statement-breakpoint
CREATE INDEX `technical_log_evidence_log_idx` ON `technical_log_evidence` (`log_id`);--> statement-breakpoint
CREATE INDEX `technical_log_evidence_expires_idx` ON `technical_log_evidence` (`expires_at`);--> statement-breakpoint
CREATE TABLE `technical_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`correlation_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`batch_id` text,
	`stage` text NOT NULL,
	`status` text NOT NULL,
	`error_code` text,
	`provider_ref` text,
	`model_ref` text,
	`rule_template_version` text,
	`latency_ms` integer,
	`subject_id` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_technical_logs_stage" CHECK(stage IN ('INGEST', 'BASE_RULE', 'ROUTE', 'MODEL_CALL', 'JSON_VALIDATE', 'COMMIT', 'DELIVER', 'ERROR')),
	CONSTRAINT "ck_technical_logs_status" CHECK(status IN ('OK', 'FAILED', 'SKIPPED', 'TIMED_OUT')),
	CONSTRAINT "ck_technical_logs_numbers" CHECK(sequence >= 0 AND (latency_ms IS NULL OR latency_ms >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `technical_logs_chain_sequence_uq` ON `technical_logs` (`channel_id`,`correlation_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `technical_logs_subject_idx` ON `technical_logs` (`subject_id`);--> statement-breakpoint
CREATE INDEX `technical_logs_expires_idx` ON `technical_logs` (`expires_at`);