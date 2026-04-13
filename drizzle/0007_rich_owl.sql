CREATE TABLE `whatsapp_carts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`product_id` text NOT NULL,
	`variant_id` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `whatsapp_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_wa_carts_session` ON `whatsapp_carts` (`session_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`phone_number_id` text NOT NULL,
	`access_token` text NOT NULL,
	`verify_token` text NOT NULL,
	`webhook_secret` text NOT NULL,
	`business_account_id` text,
	`admin_phones` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`wa_message_id` text,
	`direction` text NOT NULL,
	`content` text NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `whatsapp_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_wa_messages_session` ON `whatsapp_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_wa_messages_created` ON `whatsapp_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_wa_messages_wa_id` ON `whatsapp_messages` (`wa_message_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`wa_phone` text NOT NULL,
	`user_id` text,
	`otp_code` text,
	`otp_expires_at` text,
	`is_verified` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_sessions_wa_phone_unique` ON `whatsapp_sessions` (`wa_phone`);--> statement-breakpoint
CREATE INDEX `idx_wa_sessions_phone` ON `whatsapp_sessions` (`wa_phone`);--> statement-breakpoint
CREATE INDEX `idx_wa_sessions_user` ON `whatsapp_sessions` (`user_id`);--> statement-breakpoint
ALTER TABLE `orders` ADD `channel` text DEFAULT 'web' NOT NULL;