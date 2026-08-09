PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lookup` (
	`dictionary` text NOT NULL,
	`entry_id` integer NOT NULL,
	`expression` text,
	`reading` text,
	FOREIGN KEY (`dictionary`,`entry_id`) REFERENCES `entries`(`dictionary`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_lookup`("dictionary", "entry_id", "expression", "reading") SELECT "dictionary", "entry_id", "expression", "reading" FROM `lookup`;--> statement-breakpoint
DROP TABLE `lookup`;--> statement-breakpoint
ALTER TABLE `__new_lookup` RENAME TO `lookup`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_entries` (
	`id` integer NOT NULL,
	`dictionary` text NOT NULL,
	`kanji_json` text NOT NULL,
	`kana_json` text NOT NULL,
	`sense_json` text NOT NULL,
	PRIMARY KEY(`dictionary`, `id`)
);
--> statement-breakpoint
INSERT INTO `__new_entries`("id", "dictionary", "kanji_json", "kana_json", "sense_json") SELECT "id", "dictionary", "kanji_json", "kana_json", "sense_json" FROM `entries`;--> statement-breakpoint
DROP TABLE `entries`;--> statement-breakpoint
ALTER TABLE `__new_entries` RENAME TO `entries`;