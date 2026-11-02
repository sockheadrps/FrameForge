import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
const tables = [
	'projects',
	'episodes',
	'scenes',
	'shots',
	'assets',
	'tags',
	'asset_tags',
	'shot_assets',
	'prompts',
	'prompt_revisions',
	'shot_prompt_revisions',
	'takes',
	'take_inputs',
	'canvases',
	'canvas_nodes',
	'canvas_edges',
	'world_entities',
	'world_reference_versions',
	'scene_entities',
	'shot_entities',
	'character_arc_notes'
] as const;
type Table = (typeof tables)[number];
type Row = Record<string, unknown>;
const packageSchema = z.object({
	format: z.literal('frameforge-project'),
	version: z.literal(1),
	exportedAt: z.string(),
	tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
	files: z.record(z.string(), z.string()),
	warnings: z.array(z.string())
});
const idTables = new Set<Table>([
	'projects',
	'episodes',
	'scenes',
	'shots',
	'assets',
	'tags',
	'prompts',
	'prompt_revisions',
	'takes',
	'canvases',
	'canvas_nodes',
	'canvas_edges',
	'world_entities',
	'world_reference_versions',
	'character_arc_notes'
]);
const fkColumns = new Set([
	'project_id',
	'episode_id',
	'scene_id',
	'shot_id',
	'asset_id',
	'tag_id',
	'prompt_id',
	'prompt_revision_id',
	'output_asset_id',
	'take_id',
	'canvas_id',
	'source_node_id',
	'target_node_id',
	'entity_id',
	'canonical_reference_id',
	'world_reference_version_id',
	'parent_id'
]);
export class ProjectPackageService {
	constructor(
		private readonly db: FrameForgeDatabase,
		private readonly mediaRoot: string
	) {}
	export(projectId: string) {
		const c = this.db.$client;
		const rows = {} as Record<string, Row[]>;
		rows.projects = c.prepare('SELECT * FROM projects WHERE id=?').all(projectId) as Row[];
		if (!rows.projects.length) throw new Error('Project not found');
		rows.episodes = c.prepare('SELECT * FROM episodes WHERE project_id=?').all(projectId) as Row[];
		rows.scenes = c
			.prepare('SELECT s.* FROM scenes s JOIN episodes e ON e.id=s.episode_id WHERE e.project_id=?')
			.all(projectId) as Row[];
		rows.shots = c
			.prepare(
				'SELECT sh.* FROM shots sh JOIN scenes s ON s.id=sh.scene_id JOIN episodes e ON e.id=s.episode_id WHERE e.project_id=?'
			)
			.all(projectId) as Row[];
		rows.assets = c.prepare('SELECT * FROM assets WHERE project_id=?').all(projectId) as Row[];
		rows.tags = c.prepare('SELECT * FROM tags WHERE project_id=?').all(projectId) as Row[];
		rows.prompts = c.prepare('SELECT * FROM prompts WHERE project_id=?').all(projectId) as Row[];
		rows.canvases = c.prepare('SELECT * FROM canvases WHERE project_id=?').all(projectId) as Row[];
		rows.world_entities = c
			.prepare('SELECT * FROM world_entities WHERE project_id=?')
			.all(projectId) as Row[];
		const ids = (name: string) => new Set((rows[name] ?? []).map((row) => String(row.id)));
		const selectBy = (table: Table, column: string, parents: Set<string>) => {
			if (!parents.size) return [];
			return c
				.prepare(
					`SELECT * FROM ${table} WHERE ${column} IN (${[...parents].map(() => '?').join(',')})`
				)
				.all(...parents) as Row[];
		};
		rows.asset_tags = selectBy('asset_tags', 'asset_id', ids('assets'));
		rows.shot_assets = selectBy('shot_assets', 'shot_id', ids('shots'));
		rows.prompt_revisions = selectBy('prompt_revisions', 'prompt_id', ids('prompts'));
		rows.shot_prompt_revisions = selectBy('shot_prompt_revisions', 'shot_id', ids('shots'));
		rows.takes = selectBy('takes', 'shot_id', ids('shots'));
		rows.take_inputs = selectBy('take_inputs', 'take_id', ids('takes'));
		rows.canvas_nodes = selectBy('canvas_nodes', 'canvas_id', ids('canvases'));
		rows.canvas_edges = selectBy('canvas_edges', 'canvas_id', ids('canvases'));
		rows.world_reference_versions = selectBy(
			'world_reference_versions',
			'entity_id',
			ids('world_entities')
		);
		rows.scene_entities = selectBy('scene_entities', 'entity_id', ids('world_entities'));
		rows.shot_entities = selectBy('shot_entities', 'entity_id', ids('world_entities'));
		rows.character_arc_notes = selectBy('character_arc_notes', 'entity_id', ids('world_entities'));
		const files: Record<string, string> = {};
		const warnings: string[] = [];
		for (const asset of rows.assets) {
			const id = String(asset.id);
			if (asset.storage_type === 'managed' && asset.managed_path) {
				const path = resolve(this.mediaRoot, String(asset.managed_path));
				if (existsSync(path)) files[id] = readFileSync(path).toString('base64');
				else warnings.push(`Managed file missing: ${asset.original_name}`);
			} else warnings.push(`Linked media is referenced but not embedded: ${asset.original_name}`);
		}
		return {
			format: 'frameforge-project' as const,
			version: 1 as const,
			exportedAt: new Date().toISOString(),
			tables: rows,
			files,
			warnings
		};
	}
	import(raw: unknown) {
		const pkg = packageSchema.parse(raw);
		for (const name of Object.keys(pkg.tables))
			if (!tables.includes(name as Table)) throw new Error(`Unsupported manifest table: ${name}`);
		const map = new Map<string, string>();
		for (const table of tables)
			if (idTables.has(table))
				for (const row of pkg.tables[table] ?? [])
					if (row.id) map.set(String(row.id), crypto.randomUUID());
		const project = pkg.tables.projects?.[0];
		if (!project) throw new Error('Manifest has no project');
		const oldProjectId = String(project.id);
		const newProjectId = map.get(oldProjectId)!;
		let slug = String(project.slug || 'imported-project');
		let suffix = 2;
		while (this.db.$client.prepare('SELECT 1 FROM projects WHERE slug=?').get(slug))
			slug = `${String(project.slug)}-${suffix++}`;
		const insert = this.db.$client.transaction(() => {
			for (const table of tables) {
				for (const original of pkg.tables[table] ?? []) {
					const row: { [key: string]: unknown } = { ...original };
					for (const [key, val] of Object.entries(row)) {
						if (key === 'id' && val) row[key] = map.get(String(val)) ?? val;
						else if (fkColumns.has(key) && val) row[key] = map.get(String(val)) ?? val;
					}
					if (table === 'projects') {
						row.id = newProjectId;
						row.slug = slug;
						row.title = `${String(row.title)} (imported)`;
					}
					if (
						table === 'assets' &&
						row.storage_type === 'managed' &&
						pkg.files[String(original.id)]
					) {
						const extension = String(row.original_name).match(/\.[^.]+$/)?.[0] || '.bin';
						row.managed_path = `${newProjectId}/${String(row.content_hash || row.id)}${extension}`;
						const destination = resolve(this.mediaRoot, String(row.managed_path));
						mkdirSync(dirname(destination), { recursive: true });
						writeFileSync(destination, Buffer.from(pkg.files[String(original.id)], 'base64'));
						row.thumbnail_path = null;
					}
					const keys = Object.keys(row);
					this.db.$client
						.prepare(
							`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`
						)
						.run(...keys.map((key) => row[key]));
				}
			}
		});
		insert();
		return { projectId: newProjectId, slug, warnings: pkg.warnings };
	}
}
