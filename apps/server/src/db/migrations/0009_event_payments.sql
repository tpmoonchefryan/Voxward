CREATE TABLE `event_payments` (
	`event_id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`amount_micros` integer NOT NULL,
	`currency` text NOT NULL,
	`amount_display` text,
	`tier` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `channel_events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_event_payments_amount_micros" CHECK(amount_micros >= 0),
	CONSTRAINT "ck_event_payments_currency" CHECK(length(currency) BETWEEN 3 AND 8),
	CONSTRAINT "ck_event_payments_tier" CHECK(tier IS NULL OR tier BETWEEN 1 AND 7)
);--> statement-breakpoint
CREATE INDEX `event_payments_channel_created_idx` ON `event_payments` (`channel_id`,`created_at`);
