CREATE TABLE `character_arc_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`episode_id` text,
	`scene_id` text,
	`note` text NOT NULL,
	`turning_point` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `world_entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `scene_entities` (
	`scene_id` text NOT NULL,
	`entity_id` text NOT NULL,
	PRIMARY KEY(`scene_id`, `entity_id`),
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `world_entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shot_entities` (
	`shot_id` text NOT NULL,
	`entity_id` text NOT NULL,
	PRIMARY KEY(`shot_id`, `entity_id`),
	FOREIGN KEY (`shot_id`) REFERENCES `shots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `world_entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `world_entities` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`canonical_reference_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `world_entities_project_idx` ON `world_entities` (`project_id`);--> statement-breakpoint
CREATE TABLE `world_reference_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`entity_id`) REFERENCES `world_entities`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `world_reference_version_idx` ON `world_reference_versions` (`entity_id`,`version_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `world_reference_asset_idx` ON `world_reference_versions` (`entity_id`,`asset_id`);--> statement-breakpoint
ALTER TABLE `take_inputs` ADD `world_reference_version_id` text;