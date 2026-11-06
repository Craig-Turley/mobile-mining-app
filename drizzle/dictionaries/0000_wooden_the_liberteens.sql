CREATE TABLE `dictionaries` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`revision` text NOT NULL,
	`format` integer,
	`version` integer,
	`author` text,
	`description` text,
	`attribution` text,
	`source_language` text,
	`target_language` text,
	`css` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dictionaries_title_unique` ON `dictionaries` (`title`);