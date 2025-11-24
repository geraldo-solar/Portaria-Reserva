CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` int NOT NULL,
	`userId` int,
	`details` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticketTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketTypes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`ticketTypeId` int NOT NULL,
	`price` int NOT NULL,
	`qrCode` varchar(255) NOT NULL,
	`status` enum('active','cancelled','used') NOT NULL DEFAULT 'active',
	`cancelledAt` timestamp,
	`cancellationReason` text,
	`printedAt` timestamp,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_qrCode_unique` UNIQUE(`qrCode`)
);
