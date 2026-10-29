import { and, asc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import { episodes, projects, scenes, shots } from '../db/schema';

const title = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(20_000).default('');

export const projectInput = z.object({
	title,
	logline: z.string().trim().max(500).default(''),
	synopsis: optionalText,
	genre: z.string().trim().max(120).default(''),
	visualStyle: optionalText,
	status: z
		.enum(['concept', 'pre-production', 'production', 'review', 'complete', 'archived'])
		.default('concept')
});

export const episodeInput = z.object({ title, synopsis: optionalText });
export const sceneInput = z.object({
	title,
	description: optionalText,
	location: z.string().trim().max(240).default(''),
	narrativeNotes: optionalText
});
export const shotInput = z.object({
	title,
	actionDescription: optionalText,
	cameraFraming: z.string().trim().max(240).default(''),
	cameraMovement: z.string().trim().max(240).default(''),
	targetDurationMs: z.coerce.number().int().min(0).max(86_400_000).default(0),
	dialogue: optionalText,
	continuityNotes: optionalText,
	status: z
		.enum(['planned', 'ready', 'generating', 'review', 'approved', 'blocked'])
		.default('planned')
});

type ProjectInput = z.input<typeof projectInput>;
type EpisodeInput = z.input<typeof episodeInput>;
type SceneInput = z.input<typeof sceneInput>;
type ShotInput = z.input<typeof shotInput>;

function slugify(value: string) {
	return (
		value
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '') || 'project'
	);
}

async function nextPosition(
	db: FrameForgeDatabase,
	table: typeof episodes | typeof scenes | typeof shots,
	parentColumn: typeof episodes.projectId | typeof scenes.episodeId | typeof shots.sceneId,
	parentId: string
) {
	const [row] = await db
		.select({ value: max(table.position) })
		.from(table)
		.where(eq(parentColumn, parentId));
	return (row?.value ?? -1) + 1;
}

export class StoryService {
	constructor(private readonly db: FrameForgeDatabase) {}

	listProjects() {
		return this.db.select().from(projects).orderBy(asc(projects.title));
	}

	getProject(id: string) {
		return this.db.query.projects.findFirst({ where: eq(projects.id, id) });
	}

	getProjectBySlug(slug: string) {
		return this.db.query.projects.findFirst({
			where: eq(projects.slug, slug),
			with: {
				episodes: {
					orderBy: [asc(episodes.position)],
					with: {
						scenes: {
							orderBy: [asc(scenes.position)],
							with: { shots: { orderBy: [asc(shots.position)] } }
						}
					}
				}
			}
		});
	}

	async createProject(input: ProjectInput) {
		const values = projectInput.parse(input);
		const base = slugify(values.title);
		let slug = base;
		let suffix = 2;
		while (
			await this.db.query.projects.findFirst({
				where: eq(projects.slug, slug),
				columns: { id: true }
			})
		)
			slug = `${base}-${suffix++}`;
		const [project] = await this.db
			.insert(projects)
			.values({ id: crypto.randomUUID(), slug, ...values })
			.returning();
		return project;
	}

	async updateProject(id: string, input: ProjectInput) {
		const values = projectInput.parse(input);
		const [project] = await this.db
			.update(projects)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(projects.id, id))
			.returning();
		return project;
	}

	deleteProject(id: string) {
		return this.db.delete(projects).where(eq(projects.id, id));
	}

	async createEpisode(projectId: string, input: EpisodeInput) {
		const values = episodeInput.parse(input);
		const position = await nextPosition(this.db, episodes, episodes.projectId, projectId);
		const [episode] = await this.db
			.insert(episodes)
			.values({ id: crypto.randomUUID(), projectId, position, ...values })
			.returning();
		return episode;
	}

	async updateEpisode(id: string, input: EpisodeInput) {
		const [episode] = await this.db
			.update(episodes)
			.set({ ...episodeInput.parse(input), updatedAt: new Date() })
			.where(eq(episodes.id, id))
			.returning();
		return episode;
	}

	deleteEpisode(id: string) {
		return this.db.delete(episodes).where(eq(episodes.id, id));
	}

	async createScene(episodeId: string, input: SceneInput) {
		const values = sceneInput.parse(input);
		const position = await nextPosition(this.db, scenes, scenes.episodeId, episodeId);
		const [scene] = await this.db
			.insert(scenes)
			.values({ id: crypto.randomUUID(), episodeId, position, ...values })
			.returning();
		return scene;
	}

	async updateScene(id: string, input: SceneInput) {
		const [scene] = await this.db
			.update(scenes)
			.set({ ...sceneInput.parse(input), updatedAt: new Date() })
			.where(eq(scenes.id, id))
			.returning();
		return scene;
	}

	deleteScene(id: string) {
		return this.db.delete(scenes).where(eq(scenes.id, id));
	}

	async createShot(sceneId: string, input: ShotInput) {
		const values = shotInput.parse(input);
		const position = await nextPosition(this.db, shots, shots.sceneId, sceneId);
		const [shot] = await this.db
			.insert(shots)
			.values({ id: crypto.randomUUID(), sceneId, position, ...values })
			.returning();
		return shot;
	}

	async updateShot(id: string, input: ShotInput) {
		const [shot] = await this.db
			.update(shots)
			.set({ ...shotInput.parse(input), updatedAt: new Date() })
			.where(eq(shots.id, id))
			.returning();
		return shot;
	}

	deleteShot(id: string) {
		return this.db.delete(shots).where(eq(shots.id, id));
	}

	async reorderEpisodes(projectId: string, orderedIds: string[]) {
		const current = await this.db
			.select({ id: episodes.id })
			.from(episodes)
			.where(eq(episodes.projectId, projectId));
		this.assertSameIds(
			current.map((row) => row.id),
			orderedIds
		);
		this.db.transaction((tx) => {
			for (const [position, id] of orderedIds.entries())
				tx.update(episodes)
					.set({ position, updatedAt: new Date() })
					.where(and(eq(episodes.id, id), eq(episodes.projectId, projectId)))
					.run();
		});
	}

	async reorderScenes(episodeId: string, orderedIds: string[]) {
		const current = await this.db
			.select({ id: scenes.id })
			.from(scenes)
			.where(eq(scenes.episodeId, episodeId));
		this.assertSameIds(
			current.map((row) => row.id),
			orderedIds
		);
		this.db.transaction((tx) => {
			for (const [position, id] of orderedIds.entries())
				tx.update(scenes)
					.set({ position, updatedAt: new Date() })
					.where(and(eq(scenes.id, id), eq(scenes.episodeId, episodeId)))
					.run();
		});
	}

	async reorderShots(sceneId: string, orderedIds: string[]) {
		const current = await this.db
			.select({ id: shots.id })
			.from(shots)
			.where(eq(shots.sceneId, sceneId));
		this.assertSameIds(
			current.map((row) => row.id),
			orderedIds
		);
		this.db.transaction((tx) => {
			for (const [position, id] of orderedIds.entries())
				tx.update(shots)
					.set({ position, updatedAt: new Date() })
					.where(and(eq(shots.id, id), eq(shots.sceneId, sceneId)))
					.run();
		});
	}

	private assertSameIds(current: string[], ordered: string[]) {
		if (
			current.length !== ordered.length ||
			current.some((id) => !ordered.includes(id)) ||
			new Set(ordered).size !== ordered.length
		)
			throw new Error('Reorder request must contain every child exactly once');
	}
}

export function parseOrderedIds(value: unknown) {
	return z.array(z.string().uuid()).parse(value);
}
