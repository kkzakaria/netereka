-- SQLite forbids ADD COLUMN with a non-constant default (datetime('now')),
-- so we add the column with a constant sentinel default then backfill from
-- created_at. New rows always set updated_at explicitly in app code, so the
-- sentinel default is never observed at runtime.
ALTER TABLE `categories` ADD `updated_at` text NOT NULL DEFAULT '1970-01-01 00:00:00';--> statement-breakpoint
UPDATE `categories` SET `updated_at` = `created_at`;
