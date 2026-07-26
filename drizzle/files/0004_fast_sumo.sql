CREATE TABLE `defaults` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`model_application_id` integer,
	`deck_application_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_application_id`) REFERENCES `models`(`application_id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`deck_application_id`) REFERENCES `decks`(`application_id`) ON UPDATE cascade ON DELETE set null
);
