-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `lookup` (
	`entry_id` integer NOT NULL,
	`expression` text,
	`reading` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`id` integer PRIMARY KEY,
	`kanji_json` text NOT NULL,
	`kana_json` text NOT NULL,
	`sense_json` text NOT NULL
);

*/