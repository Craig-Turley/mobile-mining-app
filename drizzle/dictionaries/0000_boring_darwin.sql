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
	`target_language` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dictionaries_title_unique` ON `dictionaries` (`title`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY NOT NULL,
	`dictionary` text NOT NULL,
	`expression` text NOT NULL,
	`reading` text NOT NULL,
	`definition_tags` text NOT NULL,
	`rules` text NOT NULL,
	`score` integer NOT NULL,
	`definitions_json` text NOT NULL,
	`sequence` integer NOT NULL,
	`term_tags` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_terms_dictionary` ON `terms` (`dictionary`);--> statement-breakpoint
CREATE INDEX `idx_entries_expression` ON `terms` (`expression`);--> statement-breakpoint
CREATE INDEX `idx_entries_reading` ON `terms` (`reading`);