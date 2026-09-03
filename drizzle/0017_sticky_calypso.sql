CREATE TABLE `oauthAccessToken` (
	`id` text PRIMARY KEY NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`accessTokenExpiresAt` text NOT NULL,
	`refreshTokenExpiresAt` text NOT NULL,
	`clientId` text NOT NULL,
	`userId` text,
	`scopes` text NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `oauthApplication`(`clientId`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauthAccessToken_accessToken_unique` ON `oauthAccessToken` (`accessToken`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauthAccessToken_refreshToken_unique` ON `oauthAccessToken` (`refreshToken`);--> statement-breakpoint
CREATE INDEX `idx_oauthAccessToken_clientId` ON `oauthAccessToken` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_oauthAccessToken_userId` ON `oauthAccessToken` (`userId`);--> statement-breakpoint
CREATE TABLE `oauthApplication` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`metadata` text,
	`clientId` text NOT NULL,
	`clientSecret` text,
	`redirectUrls` text NOT NULL,
	`type` text NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL,
	`userId` text,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauthApplication_clientId_unique` ON `oauthApplication` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_oauthApplication_userId` ON `oauthApplication` (`userId`);--> statement-breakpoint
CREATE TABLE `oauthConsent` (
	`id` text PRIMARY KEY NOT NULL,
	`clientId` text NOT NULL,
	`userId` text NOT NULL,
	`scopes` text NOT NULL,
	`consentGiven` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (datetime('now')) NOT NULL,
	`updatedAt` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`clientId`) REFERENCES `oauthApplication`(`clientId`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_oauthConsent_clientId` ON `oauthConsent` (`clientId`);--> statement-breakpoint
CREATE INDEX `idx_oauthConsent_userId` ON `oauthConsent` (`userId`);