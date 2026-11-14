PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `channel_members_copy` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`account_ref` text NOT NULL,
	`role` text NOT NULL,
	`log_access` integer DEFAULT 0 NOT NULL,
	`data_admin` integer DEFAULT 0 NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text
);--> statement-breakpoint
INSERT INTO `channel_members_copy`(`id`, `channel_id`, `account_ref`, `role`, `log_access`, `data_admin`, `granted_at`, `revoked_at`) SELECT `id`, `channel_id`, `account_ref`, `role`, `log_access`, 0, `granted_at`, `revoked_at` FROM `channel_members`;--> statement-breakpoint
DROP TABLE `channel_members`;--> statement-breakpoint
CREATE TABLE `channel_members` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`account_ref` text NOT NULL,
	`role` text NOT NULL,
	`log_access` integer DEFAULT 0 NOT NULL,
	`data_admin` integer DEFAULT 0 NOT NULL,
	`granted_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_channel_members_role" CHECK(role IN ('CHANNEL_OWNER', 'MODERATOR', 'DATA_ADMIN')),
	CONSTRAINT "ck_channel_members_log_access" CHECK(log_access IN (0, 1)),
	CONSTRAINT "ck_channel_members_data_admin" CHECK(data_admin IN (0, 1))
);--> statement-breakpoint
INSERT INTO `channel_members`(`id`, `channel_id`, `account_ref`, `role`, `log_access`, `data_admin`, `granted_at`, `revoked_at`) SELECT `id`, `channel_id`, `account_ref`, `role`, `log_access`, `data_admin`, `granted_at`, `revoked_at` FROM `channel_members_copy`;--> statement-breakpoint
DROP TABLE `channel_members_copy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `channel_members_active_uq` ON `channel_members` (`channel_id`,`account_ref`) WHERE revoked_at IS NULL;
