CREATE TABLE IF NOT EXISTS `banners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`badge_text` text,
	`badge_color` text DEFAULT 'mint' NOT NULL,
	`image_url` text,
	`link_url` text NOT NULL,
	`cta_text` text DEFAULT 'Découvrir' NOT NULL,
	`price` integer,
	`bg_gradient_from` text DEFAULT '#183C78' NOT NULL,
	`bg_gradient_to` text DEFAULT '#1E4A8F' NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_banners_active_order` ON `banners` (`is_active`,`display_order`);
