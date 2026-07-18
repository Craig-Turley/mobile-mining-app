CREATE TABLE `models` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`modelFormData` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
