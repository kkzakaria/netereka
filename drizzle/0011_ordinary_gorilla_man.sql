CREATE TABLE `ai_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`anthropic_api_key` text,
	`model` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
