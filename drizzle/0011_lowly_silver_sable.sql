CREATE TABLE `ai_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`anthropic_api_key` text,
	`model` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	CONSTRAINT "ai_config_singleton_id" CHECK("ai_config"."id" = 1),
	CONSTRAINT "ai_config_enabled_bool" CHECK("ai_config"."enabled" in (0, 1))
);
