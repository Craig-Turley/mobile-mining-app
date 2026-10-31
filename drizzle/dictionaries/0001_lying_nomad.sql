PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_terms` (
	`id` integer PRIMARY KEY NOT NULL,
	`dictionary` text NOT NULL,
	`expression` text NOT NULL,
	`reading` text NOT NULL,
	`definition_tags` text,
	`rules` text NOT NULL,
	`score` integer NOT NULL,
	`definitions_json` text NOT NULL,
	`sequence` integer NOT NULL,
	`term_tags` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_terms`("id", "dictionary", "expression", "reading", "definition_tags", "rules", "score", "definitions_json", "sequence", "term_tags") SELECT "id", "dictionary", "expression", "reading", "definition_tags", "rules", "score", "definitions_json", "sequence", "term_tags" FROM `terms`;--> statement-breakpoint
DROP TABLE `terms`;--> statement-breakpoint
ALTER TABLE `__new_terms` RENAME TO `terms`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_terms_dictionary` ON `terms` (`dictionary`);--> statement-breakpoint
CREATE INDEX `idx_entries_expression` ON `terms` (`expression`);--> statement-breakpoint
CREATE INDEX `idx_entries_reading` ON `terms` (`reading`);--> statement-breakpoint
ALTER TABLE `dictionaries` ADD `css` text;