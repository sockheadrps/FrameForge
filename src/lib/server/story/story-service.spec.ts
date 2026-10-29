import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { episodes, scenes, shots } from '../db/schema';
import { StoryService } from './story-service';

describe('StoryService', () => {
	let directory: string;
	let filename: string;
	let db: FrameForgeDatabase;
	let service: StoryService;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-story-'));
		filename = join(directory, 'test.db');
		db = createDatabase(filename);
		migrateDatabase(db, resolve('drizzle'));
		service = new StoryService(db);
	});

	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});

	it('persists and reloads a complete story hierarchy', async () => {
		const project = await service.createProject({ title: 'Ghosts of the Machine' });
		const episode = await service.createEpisode(project.id, { title: 'Episode 01' });
		const scene = await service.createScene(episode.id, { title: 'The escape' });
		await service.createShot(scene.id, { title: 'Motorcycle drive-by', targetDurationMs: 4200 });

		db.$client.close();
		db = createDatabase(filename);
		service = new StoryService(db);
		const restored = await service.getProjectBySlug('ghosts-of-the-machine');

		expect(restored?.episodes[0]?.scenes[0]?.shots[0]?.title).toBe('Motorcycle drive-by');
		expect(restored?.episodes[0]?.scenes[0]?.shots[0]?.targetDurationMs).toBe(4200);
	});

	it('reorders children transactionally and rejects incomplete order sets', async () => {
		const project = await service.createProject({ title: 'Ordering test' });
		const first = await service.createEpisode(project.id, { title: 'First' });
		const second = await service.createEpisode(project.id, { title: 'Second' });
		await service.reorderEpisodes(project.id, [second.id, first.id]);

		const reordered = await service.getProjectBySlug(project.slug);
		expect(reordered?.episodes.map((episode) => episode.title)).toEqual(['Second', 'First']);
		await expect(service.reorderEpisodes(project.id, [first.id])).rejects.toThrow(
			'every child exactly once'
		);
	});

	it('enforces foreign keys and cascades deleted hierarchy records', async () => {
		const project = await service.createProject({ title: 'Cascade test' });
		const episode = await service.createEpisode(project.id, { title: 'Episode' });
		const scene = await service.createScene(episode.id, { title: 'Scene' });
		await service.createShot(scene.id, { title: 'Shot' });
		await service.deleteProject(project.id);

		expect(await db.select().from(episodes)).toHaveLength(0);
		expect(await db.select().from(scenes)).toHaveLength(0);
		expect(await db.select().from(shots)).toHaveLength(0);
		await expect(
			service.createEpisode('missing-project', { title: 'Impossible' })
		).rejects.toThrow();
	});
});
