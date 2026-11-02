CREATE TABLE `canvas_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`source_node_id` text NOT NULL,
	`target_node_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`canvas_id`) REFERENCES `canvases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_node_id`) REFERENCES `canvas_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_node_id`) REFERENCES `canvas_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvas_edges_canvas_idx` ON `canvas_edges` (`canvas_id`);--> statement-breakpoint
CREATE TABLE `canvas_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`type` text NOT NULL,
	`record_id` text,
	`label` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`x` integer NOT NULL,
	`y` integer NOT NULL,
	`parent_id` text,
	`width` integer,
	`height` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`canvas_id`) REFERENCES `canvases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvas_nodes_canvas_idx` ON `canvas_nodes` (`canvas_id`);--> statement-breakpoint
CREATE TABLE `canvases` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`scene_id` text,
	`name` text NOT NULL,
	`viewport_x` integer DEFAULT 0 NOT NULL,
	`viewport_y` integer DEFAULT 0 NOT NULL,
	`viewport_zoom` integer DEFAULT 1000 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`scene_id`) REFERENCES `scenes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `canvases_project_idx` ON `canvases` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `canvases_scene_scope_idx` ON `canvases` (`project_id`,`scene_id`);