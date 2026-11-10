ALTER TABLE `technical_logs` ADD COLUMN `task_id` text REFERENCES `tasks`(`id`);--> statement-breakpoint
ALTER TABLE `technical_logs` ADD COLUMN `attempt` integer CONSTRAINT "ck_technical_logs_attempt" CHECK(attempt IS NULL OR attempt >= 1);--> statement-breakpoint
ALTER TABLE `technical_logs` ADD COLUMN `level` text DEFAULT 'INFO' NOT NULL CONSTRAINT "ck_technical_logs_level" CHECK(level IN ('INFO', 'WARN', 'ERROR'));--> statement-breakpoint
ALTER TABLE `technical_logs` ADD COLUMN `data_json` text CONSTRAINT "ck_technical_logs_data" CHECK(data_json IS NULL OR (json_valid(data_json) AND length(CAST(data_json AS BLOB)) <= 2000));--> statement-breakpoint
CREATE INDEX `technical_logs_task_idx` ON `technical_logs` (`task_id`);
