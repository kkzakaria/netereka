CREATE TABLE `content_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`kind` text DEFAULT 'update' NOT NULL,
	`payload` text NOT NULL,
	`origin` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`base_version` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`resolved_at` text,
	`resolved_by` text
);
--> statement-breakpoint
CREATE INDEX `idx_revisions_target` ON `content_revisions` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_revisions_status` ON `content_revisions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_revisions_created` ON `content_revisions` (`created_at`);