CREATE TABLE `whatsapp_consent` (
	`conversationSid` text(255) PRIMARY KEY NOT NULL,
	`toNumber` text(50) NOT NULL,
	`apt` text(100) NOT NULL,
	`visitor` text(255) NOT NULL,
	`company` text(255) NOT NULL,
	`status` text(20) DEFAULT 'pending' NOT NULL,
	`lastMsgSid` text(255),
	`decidedAt` integer,
	`transcript` text,
	`ttlSeconds` integer DEFAULT 300 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `whatsapp_consent_status_idx` ON `whatsapp_consent` (`status`);--> statement-breakpoint
CREATE INDEX `whatsapp_consent_to_number_idx` ON `whatsapp_consent` (`toNumber`);