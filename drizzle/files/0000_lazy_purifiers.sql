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
CREATE INDEX `idx_videos_subtitle_id` ON `videos` (`subtitle_id`);