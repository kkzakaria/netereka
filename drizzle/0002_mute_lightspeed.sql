CREATE TABLE `banner_gradients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color_from` text NOT NULL,
	`color_to` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
