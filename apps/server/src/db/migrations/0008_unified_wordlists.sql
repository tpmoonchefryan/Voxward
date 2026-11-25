PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `rule_terms_copy` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`term` text NOT NULL,
	`match_kind` text NOT NULL,
	`language` text NOT NULL,
	`group_code` text NOT NULL,
	`list_kind` text DEFAULT 'BLACKLIST' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`action` text DEFAULT 'REVIEW' NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	`retired_at` text
);--> statement-breakpoint
INSERT INTO `rule_terms_copy`(`id`, `channel_id`, `term`, `match_kind`, `language`, `group_code`, `list_kind`, `enabled`, `action`, `created_at`, `created_by_ref`, `retired_at`) SELECT `id`, `channel_id`, `term`, `match_kind`, `language`, `group_code`, 'BLACKLIST', 1, 'REVIEW', `created_at`, `created_by_ref`, `retired_at` FROM `rule_terms`;--> statement-breakpoint
DROP TABLE `rule_terms`;--> statement-breakpoint
CREATE TABLE `rule_terms` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`term` text NOT NULL,
	`match_kind` text NOT NULL,
	`language` text NOT NULL,
	`group_code` text NOT NULL,
	`list_kind` text DEFAULT 'BLACKLIST' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`action` text DEFAULT 'REVIEW' NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	`retired_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_rule_terms_match_kind" CHECK(match_kind IN ('EXACT', 'CONTAINS', 'NORMALIZED', 'CROSS_LANGUAGE_PHONETIC', 'CONSTRAINED_REGEX')),
	CONSTRAINT "ck_rule_terms_list_kind" CHECK(list_kind IN ('BLACKLIST', 'WHITELIST')),
	CONSTRAINT "ck_rule_terms_enabled" CHECK(enabled IN (0, 1)),
	CONSTRAINT "ck_rule_terms_action" CHECK(action IN ('BLOCK', 'REVIEW'))
);--> statement-breakpoint
INSERT INTO `rule_terms`(`id`, `channel_id`, `term`, `match_kind`, `language`, `group_code`, `list_kind`, `enabled`, `action`, `created_at`, `created_by_ref`, `retired_at`) SELECT `id`, `channel_id`, `term`, `match_kind`, `language`, `group_code`, `list_kind`, `enabled`, `action`, `created_at`, `created_by_ref`, `retired_at` FROM `rule_terms_copy`;--> statement-breakpoint
DROP TABLE `rule_terms_copy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `rule_terms_active_uq` ON `rule_terms` (`channel_id`,`list_kind`,`match_kind`,`language`,`term`) WHERE retired_at IS NULL;--> statement-breakpoint
CREATE TABLE `wordlist_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`rule_version` integer NOT NULL,
	`entries_json` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by_ref` text NOT NULL,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_wordlist_snapshots_version" CHECK(rule_version >= 1),
	CONSTRAINT "ck_wordlist_snapshots_json" CHECK(json_valid(entries_json))
);--> statement-breakpoint
CREATE UNIQUE INDEX `wordlist_snapshots_channel_version_uq` ON `wordlist_snapshots` (`channel_id`,`rule_version`);
