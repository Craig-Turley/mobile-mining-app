CREATE TABLE `entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`dictionary` text NOT NULL,
	`kanji_json` text NOT NULL,
	`kana_json` text NOT NULL,
	`sense_json` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lookup` (
	`entry_id` integer NOT NULL,
	`expression` text,
	`reading` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE cascade
);
