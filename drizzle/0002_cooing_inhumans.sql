CREATE TABLE `resident` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apartmentNumber` text(100) NOT NULL,
	`phoneNumber` text(50) NOT NULL,
	`residentName` text(255),
	`notes` text(500),
	`isActive` integer DEFAULT true NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resident_apartmentNumber_unique` ON `resident` (`apartmentNumber`);--> statement-breakpoint
CREATE INDEX `resident_apartment_idx` ON `resident` (`apartmentNumber`);--> statement-breakpoint
CREATE INDEX `resident_phone_idx` ON `resident` (`phoneNumber`);