CREATE TABLE `queue` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry` text NOT NULL,
	`model_application_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_application_id`) REFERENCES `models`(`application_id`) ON UPDATE cascade ON DELETE cascade
);
