CREATE TABLE `prompt_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_id` text NOT NULL,
	`revision_number` integer NOT NULL,
	`text` text NOT NULL,
	`negative_prompt` text DEFAULT '' NOT NULL,
	`model_workflow` text DEFAULT '' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prompt_revisions_number_idx` ON `prompt_revisions` (`prompt_id`,`revision_number`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompts_project_idx` ON `prompts` (`project_id`);--> statement-breakpoint
CREATE TABLE `shot_prompt_revisions` (
	`shot_id` text NOT NULL,
	`prompt_revision_id` text NOT NULL,
	PRIMARY KEY(`shot_id`, `prompt_revision_id`),
	FOREIGN KEY (`shot_id`) REFERENCES `shots`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_revision_id`) REFERENCES `prompt_revisions`(`id`) ON UPDATE no action ON DELETE cascade
);
