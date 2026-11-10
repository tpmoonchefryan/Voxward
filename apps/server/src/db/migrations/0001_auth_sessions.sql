CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`login_name` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`disabled_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_login_name_uq` ON `auth_accounts` (`login_name`);--> statement-breakpoint
CREATE TABLE `auth_output_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`scope` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_by_account_id` text NOT NULL,
	`created_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_account_id`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_auth_output_tokens_scope" CHECK(scope IN ('ROOM_READ_ONLY'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_output_tokens_hash_uq` ON `auth_output_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_output_tokens_channel_idx` ON `auth_output_tokens` (`channel_id`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `auth_sessions_account_idx` ON `auth_sessions` (`account_id`);