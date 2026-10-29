CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`synopsis` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `episodes_project_position_idx` ON `episodes` (`project_id`,`position`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`logline` text DEFAULT '' NOT NULL,
	`synopsis` text DEFAULT '' NOT NULL,
	`genre` text DEFAULT '' NOT NULL,
	`visual_style` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'concept' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE TABLE `scenes` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`narrative_notes` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scenes_episode_position_idx` ON `scenes` (`episode_id`,`position`);--> statement-breakpoint
CREATE TABLE `shots` (
	`id` text PRIMARY KEY NOT NULL,
	`scene_id` text NOT NULL,
	`title` text NOT NULL,
	`action_description` text DEFAULT '' NOT NULL,
	`camera_framing` text DEFAULT '' NOT NULL,
	`camera_movement` text DEFAULT '' NOT NULL,
	`target_duration_ms` integer DEFAULT 0 NOT NULL,
	`dialogue` text DEFAULT '' NOT NULL,
	`continuity_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shots_scene_position_idx` ON `shots` (`scene_id`,`position`);