import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { assets } from '../db/schema';
import { PromptService } from '../prompts/prompt-service';
import { StoryService } from '../story/story-service';
import { ProjectPackageService } from './project-package';
describe('ProjectPackageService', () => {
	let directory: string;
	let media: string;
	let db: FrameForgeDatabase;
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-package-'));
		media = join(directory, 'media');
		db = createDatabase(join(directory, 'db.sqlite'));
		migrateDatabase(db, resolve('drizzle'));
	});
	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});
	it('exports and imports a validated package with managed media and collision-safe ids', async () => {
		const story = new StoryService(db);
		const project = await story.createProject({ title: 'Portable' });
		const ep = await story.createEpisode(project.id, { title: 'Episode' });
		const scene = await story.createScene(ep.id, { title: 'Scene' });
		await story.createShot(scene.id, { title: 'Shot' });
		await new PromptService(db).createPrompt(project.id, 'Prompt', { text: 'Exact prompt' });
		const assetId = crypto.randomUUID();
		const relative = `${project.id}/asset.png`;
		mkdirSync(join(media, project.id), { recursive: true });
		writeFileSync(join(media, relative), Buffer.from('media'));
		await db.insert(assets).values({
			id: assetId,
			projectId: project.id,
			storageType: 'managed',
			mediaType: 'image',
			originalName: 'asset.png',
			mimeType: 'image/png',
			managedPath: relative,
			sizeBytes: 5
		});
		const service = new ProjectPackageService(db, media);
		const pkg = service.export(project.id);
		const imported = service.import(pkg);
		expect(imported.slug).toBe('portable-2');
		const restored = await story.getProjectBySlug(imported.slug);
		expect(restored?.episodes[0]?.scenes[0]?.shots[0]?.title).toBe('Shot');
		expect(
			await db.query.prompts.findFirst({
				where: (table, { eq }) => eq(table.projectId, imported.projectId)
			})
		).toBeTruthy();
		expect(
			await db.query.assets.findFirst({
				where: (table, { eq }) => eq(table.projectId, imported.projectId)
			})
		).toMatchObject({ originalName: 'asset.png' });
	});
	it('reports linked media that cannot be embedded', async () => {
		const project = await new StoryService(db).createProject({ title: 'Linked' });
		await db.insert(assets).values({
			id: crypto.randomUUID(),
			projectId: project.id,
			storageType: 'linked',
			mediaType: 'image',
			originalName: 'outside.png',
			mimeType: 'image/png',
			linkedRootId: 'comfy',
			linkedRelativePath: 'outside.png',
			sizeBytes: 1
		});
		expect(new ProjectPackageService(db, media).export(project.id).warnings[0]).toContain(
			'not embedded'
		);
	});
});
