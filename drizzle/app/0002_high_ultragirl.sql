CREATE TABLE `decks` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_form_data` text NOT NULL,
	`deck` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
