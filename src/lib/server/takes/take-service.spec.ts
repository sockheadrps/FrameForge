import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { assets, takes } from '../db/schema';
import { PromptService } from '../prompts/prompt-service';
import { StoryService } from '../story/story-service';
import { TakeService } from './take-service';

describe('TakeService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	let story: StoryService;
	let service: TakeService;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-takes-'));
		db = createDatabase(join(directory, 'test.db'));
		migrateDatabase(db, resolve('drizzle'));
		story = new StoryService(db);
		service = new TakeService(db);
	});
	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});

	async function setup() {
		const project = await story.createProject({ title: `Takes ${crypto.randomUUID()}` });
		const episode = await story.createEpisode(project.id, { title: 'Episode' });
		const scene = await story.createScene(episode.id, { title: 'Scene' });
		const shot = await story.createShot(scene.id, { title: 'Shot' });
		const outputAssetId = crypto.randomUUID();
		const inputAssetId = crypto.randomUUID();
		await db.insert(assets).values([
			{
				id: outputAssetId,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'video',
				originalName: 'take.mp4',
				mimeType: 'video/mp4',
				managedPath: 'take.mp4',
				sizeBytes: 100
			},
			{
				id: inputAssetId,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'image',
				originalName: 'reference.png',
				mimeType: 'image/png',
				managedPath: 'reference.png',
				sizeBytes: 50
			}
		]);
		const revision = await new PromptService(db).createPrompt(project.id, 'Prompt', {
			text: 'Exact historical prompt'
		});
		return { project, shot, outputAssetId, inputAssetId, revision };
	}

	it('records exact prompt, ordered inputs, metadata, and output lineage', async () => {
		const item = await setup();
		await service.create({
			shotId: item.shot.id,
			outputAssetId: item.outputAssetId,
			promptRevisionId: item.revision.id,
			name: 'Generation 1',
			model: 'Wan 2.1',
			seed: '42',
			resolution: '1280x720',
			workflow: 'I2V',
			inputs: [{ assetId: item.inputAssetId, role: 'start-frame' }]
		});
		const [take] = await service.listShotTakes(item.shot.id);
		expect(take.promptRevision?.text).toBe('Exact historical prompt');
		expect(take.inputs[0]?.asset.originalName).toBe('reference.png');
		expect(take.outputAsset.id).toBe(item.outputAssetId);
	});

	it('enforces one primary approved take per shot', async () => {
		const item = await setup();
		const first = await service.create({
			shotId: item.shot.id,
			outputAssetId: item.outputAssetId,
			name: 'First'
		});
		const second = await service.create({
			shotId: item.shot.id,
			outputAssetId: item.outputAssetId,
			name: 'Second'
		});
		await service.setReview(first.id, 'approved', 'Initial choice');
		await service.setReview(second.id, 'approved', 'Better motion');
		const rows = await db.select().from(takes);
		expect(rows.filter((row) => row.isPrimary)).toHaveLength(1);
		expect(rows.find((row) => row.isPrimary)?.id).toBe(second.id);
		expect(rows.find((row) => row.id === first.id)?.status).toBe('candidate');
	});

	it('rejects assets from another project', async () => {
		const first = await setup();
		const other = await setup();
		await expect(
			service.create({ shotId: first.shot.id, outputAssetId: other.outputAssetId, name: 'Invalid' })
		).rejects.toThrow('shot project');
	});

	it('stores non-destructive review in and out markers', async () => {
		const item = await setup();
		const take = await service.create({
			shotId: item.shot.id,
			outputAssetId: item.outputAssetId,
			name: 'Marked'
		});
		await service.setMarkers(take.id, 250, 3250);
		const [loaded] = await service.listShotTakes(item.shot.id);
		expect(loaded).toMatchObject({ reviewInMs: 250, reviewOutMs: 3250 });
		await expect(service.setMarkers(take.id, 500, 100)).rejects.toThrow('follow in');
	});
});
