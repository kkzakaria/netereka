CREATE TABLE `ai_image_usage` (
	`month_key` text PRIMARY KEY NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
