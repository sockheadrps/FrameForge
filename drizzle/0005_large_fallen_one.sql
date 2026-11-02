CREATE TABLE `take_inputs` (
	`take_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`role` text DEFAULT 'reference' NOT NULL,
	`position` integer NOT NULL,
	PRIMARY KEY(`take_id`, `asset_id`),
	FOREIGN KEY (`take_id`) REFERENCES `takes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `take_inputs_order_idx` ON `take_inputs` (`take_id`,`position`);--> statement-breakpoint
CREATE TABLE `takes` (
	`id` text PRIMARY KEY NOT NULL,
	`shot_id` text NOT NULL,
	`output_asset_id` text NOT NULL,
	`prompt_revision_id` text,
	`name` text NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`review_notes` text DEFAULT '' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`seed` text DEFAULT '' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL,
	`workflow` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`shot_id`) REFERENCES `shots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`output_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`prompt_revision_id`) REFERENCES `prompt_revisions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `takes_shot_idx` ON `takes` (`shot_id`);