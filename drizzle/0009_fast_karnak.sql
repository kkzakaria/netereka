PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_whatsapp_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`phone_number_id` text,
	`display_phone_number` text,
	`access_token` text,
	`verify_token` text,
	`webhook_secret` text,
	`business_account_id` text,
	`admin_phones` text DEFAULT '[]' NOT NULL,
	`is_active` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_whatsapp_config`("id", "phone_number_id", "display_phone_number", "access_token", "verify_token", "webhook_secret", "business_account_id", "admin_phones", "is_active", "created_at", "updated_at") SELECT "id", "phone_number_id", "display_phone_number", "access_token", "verify_token", "webhook_secret", "business_account_id", "admin_phones", "is_active", "created_at", "updated_at" FROM `whatsapp_config`;--> statement-breakpoint
DROP TABLE `whatsapp_config`;--> statement-breakpoint
ALTER TABLE `__new_whatsapp_config` RENAME TO `whatsapp_config`;--> statement-breakpoint
PRAGMA foreign_keys=ON;