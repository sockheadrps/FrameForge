CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`storage_type` text NOT NULL,
	`media_type` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`linked_root_id` text,
	`linked_relative_path` text,
	`managed_path` text,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`content_hash` text,
	`source_modified_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assets_project_idx` ON `assets` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_project_linked_source_idx` ON `assets` (`project_id`,`linked_root_id`,`linked_relative_path`);