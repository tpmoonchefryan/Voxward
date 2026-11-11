CREATE TABLE `score_outcomes` (
	`idempotency_key` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`outcome` text NOT NULL,
	`reason_code` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_score_outcomes_kind" CHECK(outcome IN ('NO_EFFECT', 'REFUSED'))
);
