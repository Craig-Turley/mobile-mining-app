CREATE TABLE `subtitles` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`relative_path` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`relative_path` text NOT NULL,
	`subtitle_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`subtitle_id`) REFERENCES `subtitles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_videos_subtitle_id` ON `videos` (`subtitle_id`);--> statement-breakpoint
CREATE TABLE `models` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`modelFormData` text NOT NULL,
	`model` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decks` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck_form_data` text NOT NULL,
	`deck` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `queue` (
	`application_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry` text NOT NULL,
	`model_application_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_application_id`) REFERENCES `models`(`application_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `defaults` (
	`application_id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`model_application_id` integer,
	`deck_application_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`model_application_id`) REFERENCES `models`(`application_id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`deck_application_id`) REFERENCES `decks`(`application_id`) ON UPDATE cascade ON DELETE set null
);
