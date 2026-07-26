PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_defaults` (
	`application_id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`model_application_id` integer,
	`deck_application_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_application_id`) REFERENCES `models`(`application_id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`deck_application_id`) REFERENCES `decks`(`application_id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_defaults`("application_id", "model_application_id", "deck_application_id", "created_at", "updated_at") SELECT "application_id", "model_application_id", "deck_application_id", "created_at", "updated_at" FROM `defaults`;--> statement-breakpoint
DROP TABLE `defaults`;--> statement-breakpoint
ALTER TABLE `__new_defaults` RENAME TO `defaults`;--> statement-breakpoint
PRAGMA foreign_keys=ON;