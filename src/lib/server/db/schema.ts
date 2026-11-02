import { relations, sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

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

export const assets = sqliteTable(
	'assets',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		storageType: text('storage_type', { enum: ['managed', 'linked'] }).notNull(),
		mediaType: text('media_type', { enum: ['image', 'video'] }).notNull(),
		originalName: text('original_name').notNull(),
		mimeType: text('mime_type').notNull(),
		category: text('category', {
			enum: [
				'general',
				'character',
				'location',
				'prop',
				'style',
				'start-frame',
				'end-frame',
				'source',
				'output-image',
				'output-video'
			]
		})
			.notNull()
			.default('general'),
		notes: text('notes').notNull().default(''),
		linkedRootId: text('linked_root_id'),
		linkedRelativePath: text('linked_relative_path'),
		managedPath: text('managed_path'),
		thumbnailPath: text('thumbnail_path'),
		sizeBytes: integer('size_bytes').notNull(),
		width: integer('width'),
		height: integer('height'),
		durationMs: integer('duration_ms'),
		contentHash: text('content_hash'),
		sourceModifiedAt: integer('source_modified_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('assets_project_idx').on(table.projectId),
		uniqueIndex('assets_project_content_hash_idx').on(table.projectId, table.contentHash),
		uniqueIndex('assets_project_linked_source_idx').on(
			table.projectId,
			table.linkedRootId,
			table.linkedRelativePath
		)
	]
);

export const tags = sqliteTable(
	'tags',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color').notNull().default('#9d7dff'),
		...timestamps
	},
	(table) => [uniqueIndex('tags_project_name_idx').on(table.projectId, table.name)]
);

export const assetTags = sqliteTable(
	'asset_tags',
	{
		assetId: text('asset_id')
			.notNull()
			.references(() => assets.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.assetId, table.tagId] })]
);

export const shotAssets = sqliteTable(
	'shot_assets',
	{
		shotId: text('shot_id')
			.notNull()
			.references(() => shots.id, { onDelete: 'cascade' }),
		assetId: text('asset_id')
			.notNull()
			.references(() => assets.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('reference'),
		position: integer('position').notNull().default(0)
	},
	(table) => [primaryKey({ columns: [table.shotId, table.assetId] })]
);

export const prompts = sqliteTable(
	'prompts',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		...timestamps
	},
	(table) => [index('prompts_project_idx').on(table.projectId)]
);

export const promptRevisions = sqliteTable(
	'prompt_revisions',
	{
		id: text('id').primaryKey(),
		promptId: text('prompt_id')
			.notNull()
			.references(() => prompts.id, { onDelete: 'cascade' }),
		revisionNumber: integer('revision_number').notNull(),
		text: text('text').notNull(),
		negativePrompt: text('negative_prompt').notNull().default(''),
		modelWorkflow: text('model_workflow').notNull().default(''),
		purpose: text('purpose').notNull().default(''),
		notes: text('notes').notNull().default(''),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [uniqueIndex('prompt_revisions_number_idx').on(table.promptId, table.revisionNumber)]
);

export const shotPromptRevisions = sqliteTable(
	'shot_prompt_revisions',
	{
		shotId: text('shot_id')
			.notNull()
			.references(() => shots.id, { onDelete: 'cascade' }),
		promptRevisionId: text('prompt_revision_id')
			.notNull()
			.references(() => promptRevisions.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.shotId, table.promptRevisionId] })]
);

export const takes = sqliteTable(
	'takes',
	{
		id: text('id').primaryKey(),
		shotId: text('shot_id')
			.notNull()
			.references(() => shots.id, { onDelete: 'cascade' }),
		outputAssetId: text('output_asset_id')
			.notNull()
			.references(() => assets.id, { onDelete: 'restrict' }),
		promptRevisionId: text('prompt_revision_id').references(() => promptRevisions.id, {
			onDelete: 'set null'
		}),
		name: text('name').notNull(),
		status: text('status', { enum: ['candidate', 'approved', 'rejected'] })
			.notNull()
			.default('candidate'),
		isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
		reviewNotes: text('review_notes').notNull().default(''),
		model: text('model').notNull().default(''),
		seed: text('seed').notNull().default(''),
		resolution: text('resolution').notNull().default(''),
		workflow: text('workflow').notNull().default(''),
		reviewInMs: integer('review_in_ms'),
		reviewOutMs: integer('review_out_ms'),
		...timestamps
	},
	(table) => [index('takes_shot_idx').on(table.shotId)]
);

export const takeInputs = sqliteTable(
	'take_inputs',
	{
		takeId: text('take_id')
			.notNull()
			.references(() => takes.id, { onDelete: 'cascade' }),
		assetId: text('asset_id')
			.notNull()
			.references(() => assets.id, { onDelete: 'restrict' }),
		worldReferenceVersionId: text('world_reference_version_id'),
		role: text('role').notNull().default('reference'),
		position: integer('position').notNull()
	},
	(table) => [
		primaryKey({ columns: [table.takeId, table.assetId] }),
		index('take_inputs_order_idx').on(table.takeId, table.position)
	]
);

export const canvases = sqliteTable(
	'canvases',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		viewportX: integer('viewport_x').notNull().default(0),
		viewportY: integer('viewport_y').notNull().default(0),
		viewportZoom: integer('viewport_zoom').notNull().default(1000),
		...timestamps
	},
	(table) => [
		index('canvases_project_idx').on(table.projectId),
		uniqueIndex('canvases_scene_scope_idx').on(table.projectId, table.sceneId)
	]
);

export const canvasNodes = sqliteTable(
	'canvas_nodes',
	{
		id: text('id').primaryKey(),
		canvasId: text('canvas_id')
			.notNull()
			.references(() => canvases.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['asset', 'prompt', 'shot', 'take', 'note', 'group'] }).notNull(),
		recordId: text('record_id'),
		label: text('label').notNull(),
		notes: text('notes').notNull().default(''),
		x: integer('x').notNull(),
		y: integer('y').notNull(),
		parentId: text('parent_id'),
		width: integer('width'),
		height: integer('height'),
		...timestamps
	},
	(table) => [index('canvas_nodes_canvas_idx').on(table.canvasId)]
);

export const canvasEdges = sqliteTable(
	'canvas_edges',
	{
		id: text('id').primaryKey(),
		canvasId: text('canvas_id')
			.notNull()
			.references(() => canvases.id, { onDelete: 'cascade' }),
		sourceNodeId: text('source_node_id')
			.notNull()
			.references(() => canvasNodes.id, { onDelete: 'cascade' }),
		targetNodeId: text('target_node_id')
			.notNull()
			.references(() => canvasNodes.id, { onDelete: 'cascade' }),
		type: text('type', {
			enum: [
				'references',
				'input',
				'generated-from',
				'belongs-to-shot',
				'continues-from',
				'inspired-by'
			]
		}).notNull(),
		label: text('label').notNull().default(''),
		...timestamps
	},
	(table) => [index('canvas_edges_canvas_idx').on(table.canvasId)]
);

export const worldEntities = sqliteTable(
	'world_entities',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['character', 'location', 'prop'] }).notNull(),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		canonicalReferenceId: text('canonical_reference_id'),
		...timestamps
	},
	(table) => [index('world_entities_project_idx').on(table.projectId)]
);
export const worldReferenceVersions = sqliteTable(
	'world_reference_versions',
	{
		id: text('id').primaryKey(),
		entityId: text('entity_id')
			.notNull()
			.references(() => worldEntities.id, { onDelete: 'cascade' }),
		assetId: text('asset_id')
			.notNull()
			.references(() => assets.id, { onDelete: 'restrict' }),
		versionNumber: integer('version_number').notNull(),
		notes: text('notes').notNull().default(''),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
	},
	(table) => [
		uniqueIndex('world_reference_version_idx').on(table.entityId, table.versionNumber),
		uniqueIndex('world_reference_asset_idx').on(table.entityId, table.assetId)
	]
);
export const sceneEntities = sqliteTable(
	'scene_entities',
	{
		sceneId: text('scene_id')
			.notNull()
			.references(() => scenes.id, { onDelete: 'cascade' }),
		entityId: text('entity_id')
			.notNull()
			.references(() => worldEntities.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.sceneId, table.entityId] })]
);
export const shotEntities = sqliteTable(
	'shot_entities',
	{
		shotId: text('shot_id')
			.notNull()
			.references(() => shots.id, { onDelete: 'cascade' }),
		entityId: text('entity_id')
			.notNull()
			.references(() => worldEntities.id, { onDelete: 'cascade' })
	},
	(table) => [primaryKey({ columns: [table.shotId, table.entityId] })]
);
export const characterArcNotes = sqliteTable('character_arc_notes', {
	id: text('id').primaryKey(),
	entityId: text('entity_id')
		.notNull()
		.references(() => worldEntities.id, { onDelete: 'cascade' }),
	episodeId: text('episode_id').references(() => episodes.id, { onDelete: 'cascade' }),
	sceneId: text('scene_id').references(() => scenes.id, { onDelete: 'cascade' }),
	note: text('note').notNull(),
	turningPoint: integer('turning_point', { mode: 'boolean' }).notNull().default(false),
	...timestamps
});

export const projectsRelations = relations(projects, ({ many }) => ({
	episodes: many(episodes),
	assets: many(assets),
	tags: many(tags),
	prompts: many(prompts),
	worldEntities: many(worldEntities)
}));
export const episodesRelations = relations(episodes, ({ one, many }) => ({
	project: one(projects, { fields: [episodes.projectId], references: [projects.id] }),
	scenes: many(scenes)
}));
export const scenesRelations = relations(scenes, ({ one, many }) => ({
	episode: one(episodes, { fields: [scenes.episodeId], references: [episodes.id] }),
	shots: many(shots),
	entityLinks: many(sceneEntities)
}));
export const shotsRelations = relations(shots, ({ one, many }) => ({
	scene: one(scenes, { fields: [shots.sceneId], references: [scenes.id] }),
	shotAssets: many(shotAssets),
	takes: many(takes),
	entityLinks: many(shotEntities)
}));
export const assetsRelations = relations(assets, ({ one, many }) => ({
	project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
	tagAssignments: many(assetTags),
	shotLinks: many(shotAssets)
}));
export const tagsRelations = relations(tags, ({ one, many }) => ({
	project: one(projects, { fields: [tags.projectId], references: [projects.id] }),
	assignments: many(assetTags)
}));
export const assetTagsRelations = relations(assetTags, ({ one }) => ({
	asset: one(assets, { fields: [assetTags.assetId], references: [assets.id] }),
	tag: one(tags, { fields: [assetTags.tagId], references: [tags.id] })
}));
export const shotAssetsRelations = relations(shotAssets, ({ one }) => ({
	shot: one(shots, { fields: [shotAssets.shotId], references: [shots.id] }),
	asset: one(assets, { fields: [shotAssets.assetId], references: [assets.id] })
}));
export const promptsRelations = relations(prompts, ({ one, many }) => ({
	project: one(projects, { fields: [prompts.projectId], references: [projects.id] }),
	revisions: many(promptRevisions)
}));
export const promptRevisionsRelations = relations(promptRevisions, ({ one, many }) => ({
	prompt: one(prompts, { fields: [promptRevisions.promptId], references: [prompts.id] }),
	shotLinks: many(shotPromptRevisions)
}));
export const shotPromptRevisionsRelations = relations(shotPromptRevisions, ({ one }) => ({
	shot: one(shots, { fields: [shotPromptRevisions.shotId], references: [shots.id] }),
	revision: one(promptRevisions, {
		fields: [shotPromptRevisions.promptRevisionId],
		references: [promptRevisions.id]
	})
}));
export const takesRelations = relations(takes, ({ one, many }) => ({
	shot: one(shots, { fields: [takes.shotId], references: [shots.id] }),
	outputAsset: one(assets, { fields: [takes.outputAssetId], references: [assets.id] }),
	promptRevision: one(promptRevisions, {
		fields: [takes.promptRevisionId],
		references: [promptRevisions.id]
	}),
	inputs: many(takeInputs)
}));
export const takeInputsRelations = relations(takeInputs, ({ one }) => ({
	take: one(takes, { fields: [takeInputs.takeId], references: [takes.id] }),
	asset: one(assets, { fields: [takeInputs.assetId], references: [assets.id] }),
	worldReferenceVersion: one(worldReferenceVersions, {
		fields: [takeInputs.worldReferenceVersionId],
		references: [worldReferenceVersions.id]
	})
}));
export const canvasesRelations = relations(canvases, ({ one, many }) => ({
	project: one(projects, { fields: [canvases.projectId], references: [projects.id] }),
	scene: one(scenes, { fields: [canvases.sceneId], references: [scenes.id] }),
	nodes: many(canvasNodes),
	edges: many(canvasEdges)
}));
export const canvasNodesRelations = relations(canvasNodes, ({ one }) => ({
	canvas: one(canvases, { fields: [canvasNodes.canvasId], references: [canvases.id] })
}));
export const canvasEdgesRelations = relations(canvasEdges, ({ one }) => ({
	canvas: one(canvases, { fields: [canvasEdges.canvasId], references: [canvases.id] }),
	source: one(canvasNodes, {
		fields: [canvasEdges.sourceNodeId],
		references: [canvasNodes.id],
		relationName: 'source'
	}),
	target: one(canvasNodes, {
		fields: [canvasEdges.targetNodeId],
		references: [canvasNodes.id],
		relationName: 'target'
	})
}));
export const worldEntitiesRelations = relations(worldEntities, ({ one, many }) => ({
	project: one(projects, { fields: [worldEntities.projectId], references: [projects.id] }),
	references: many(worldReferenceVersions),
	sceneLinks: many(sceneEntities),
	shotLinks: many(shotEntities),
	arcNotes: many(characterArcNotes)
}));
export const worldReferenceVersionsRelations = relations(worldReferenceVersions, ({ one }) => ({
	entity: one(worldEntities, {
		fields: [worldReferenceVersions.entityId],
		references: [worldEntities.id]
	}),
	asset: one(assets, { fields: [worldReferenceVersions.assetId], references: [assets.id] })
}));
export const sceneEntitiesRelations = relations(sceneEntities, ({ one }) => ({
	scene: one(scenes, { fields: [sceneEntities.sceneId], references: [scenes.id] }),
	entity: one(worldEntities, { fields: [sceneEntities.entityId], references: [worldEntities.id] })
}));
export const shotEntitiesRelations = relations(shotEntities, ({ one }) => ({
	shot: one(shots, { fields: [shotEntities.shotId], references: [shots.id] }),
	entity: one(worldEntities, { fields: [shotEntities.entityId], references: [worldEntities.id] })
}));
export const characterArcNotesRelations = relations(characterArcNotes, ({ one }) => ({
	entity: one(worldEntities, {
		fields: [characterArcNotes.entityId],
		references: [worldEntities.id]
	}),
	episode: one(episodes, { fields: [characterArcNotes.episodeId], references: [episodes.id] }),
	scene: one(scenes, { fields: [characterArcNotes.sceneId], references: [scenes.id] })
}));

export type Project = typeof projects.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type Shot = typeof shots.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Take = typeof takes.$inferSelect;
