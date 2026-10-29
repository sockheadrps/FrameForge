import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.default(sql`(unixepoch() * 1000)`)
};

export const projects = sqliteTable('projects', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	logline: text('logline').notNull().default(''),
	synopsis: text('synopsis').notNull().default(''),
	genre: text('genre').notNull().default(''),
	visualStyle: text('visual_style').notNull().default(''),
	status: text('status', {
		enum: ['concept', 'pre-production', 'production', 'review', 'complete', 'archived']
	})
		.notNull()
		.default('concept'),
	...timestamps
});

export const episodes = sqliteTable(
	'episodes',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		synopsis: text('synopsis').notNull().default(''),
		position: integer('position').notNull(),
		...timestamps
	},
	(table) => [index('episodes_project_position_idx').on(table.projectId, table.position)]
);

export const scenes = sqliteTable(
	'scenes',
	{
		id: text('id').primaryKey(),
		episodeId: text('episode_id')
			.notNull()
			.references(() => episodes.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		description: text('description').notNull().default(''),
		location: text('location').notNull().default(''),
		narrativeNotes: text('narrative_notes').notNull().default(''),
		position: integer('position').notNull(),
		...timestamps
	},
	(table) => [index('scenes_episode_position_idx').on(table.episodeId, table.position)]
);

export const shots = sqliteTable(
	'shots',
	{
		id: text('id').primaryKey(),
		sceneId: text('scene_id')
			.notNull()
			.references(() => scenes.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		actionDescription: text('action_description').notNull().default(''),
		cameraFraming: text('camera_framing').notNull().default(''),
		cameraMovement: text('camera_movement').notNull().default(''),
		targetDurationMs: integer('target_duration_ms').notNull().default(0),
		dialogue: text('dialogue').notNull().default(''),
		continuityNotes: text('continuity_notes').notNull().default(''),
		status: text('status', {
			enum: ['planned', 'ready', 'generating', 'review', 'approved', 'blocked']
		})
			.notNull()
			.default('planned'),
		position: integer('position').notNull(),
		...timestamps
	},
	(table) => [index('shots_scene_position_idx').on(table.sceneId, table.position)]
);

export const projectsRelations = relations(projects, ({ many }) => ({ episodes: many(episodes) }));
export const episodesRelations = relations(episodes, ({ one, many }) => ({
	project: one(projects, { fields: [episodes.projectId], references: [projects.id] }),
	scenes: many(scenes)
}));
export const scenesRelations = relations(scenes, ({ one, many }) => ({
	episode: one(episodes, { fields: [scenes.episodeId], references: [episodes.id] }),
	shots: many(shots)
}));
export const shotsRelations = relations(shots, ({ one }) => ({
	scene: one(scenes, { fields: [shots.sceneId], references: [scenes.id] })
}));

export type Project = typeof projects.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type Shot = typeof shots.$inferSelect;
