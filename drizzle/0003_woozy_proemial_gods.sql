CREATE TABLE `asset_tags` (
	`asset_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`asset_id`, `tag_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shot_assets` (
	`shot_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`role` text DEFAULT 'reference' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`shot_id`, `asset_id`),
	FOREIGN KEY (`shot_id`) REFERENCES `shots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#9d7dff' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_project_name_idx` ON `tags` (`project_id`,`name`);--> statement-breakpoint
ALTER TABLE `assets` ADD `category` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `thumbnail_path` text;