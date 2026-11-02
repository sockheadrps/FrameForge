import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { StoryService } from '../story/story-service';
import { AssetService } from './asset-service';
import { LinkedMediaService } from './linked-media';
import { ManagedMediaStorage } from './managed-media';

describe('AssetService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	let linked: LinkedMediaService;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-assets-'));
		const output = join(directory, 'output');
		mkdirSync(output);
		writeFileSync(join(output, 'take-01.mp4'), Buffer.from([0, 1, 2, 3]));
		linked = new LinkedMediaService([output]);
		db = createDatabase(join(directory, 'test.db'));
		migrateDatabase(db, resolve('drizzle'));
	});

	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});

	it('creates one canonical linked asset without copying the source', async () => {
		const project = await new StoryService(db).createProject({ title: 'Asset test' });
		const rootId = linked.listRoots()[0]!.id;
		const service = new AssetService(db, linked);

		const first = await service.linkFromConfiguredRoot({ projectId: project.id, rootId, relativePath: 'take-01.mp4' });
		const duplicate = await service.linkFromConfiguredRoot({ projectId: project.id, rootId, relativePath: 'take-01.mp4' });

		expect(first.created).toBe(true);
		expect(first.asset.storageType).toBe('linked');
		expect(first.asset.mediaType).toBe('video');
		expect(first.asset.sizeBytes).toBe(4);
		expect(duplicate.created).toBe(false);
		expect(await service.listProjectAssets(project.id)).toHaveLength(1);
	});

	it('rejects sources outside configured roots and missing projects', async () => {
		const rootId = linked.listRoots()[0]!.id;
		const service = new AssetService(db, linked);
		await expect(service.linkFromConfiguredRoot({ projectId: crypto.randomUUID(), rootId, relativePath: '../secret.mp4' })).rejects.toThrow();
		await expect(service.linkFromConfiguredRoot({ projectId: crypto.randomUUID(), rootId, relativePath: 'take-01.mp4' })).rejects.toThrow();
	});

	it('streams, validates, hashes, and deduplicates managed image uploads', async () => {
		const project = await new StoryService(db).createProject({ title: 'Managed upload' });
		const storage = new ManagedMediaStorage(join(directory, 'media'), 1024 * 1024);
		const png = await sharp({ create: { width: 3, height: 2, channels: 4, background: '#7c5ce0' } }).png().toBuffer();
		const service = new AssetService(db, linked);
		const firstStage = await storage.stage(new Blob([png]).stream(), 'reference.png');
		const first = await service.importManaged(project.id, firstStage, storage);
		const secondStage = await storage.stage(new Blob([png]).stream(), 'duplicate.png');
		const duplicate = await service.importManaged(project.id, secondStage, storage);

		expect(first.created).toBe(true);
		expect(first.asset.width).toBe(3);
		expect(first.asset.height).toBe(2);
		expect(first.asset.thumbnailPath).toMatch(/thumbnails\/.+\.jpg$/);
		expect(first.asset.contentHash).toMatch(/^[a-f0-9]{64}$/);
		expect(existsSync(join(directory, 'media', first.asset.managedPath!))).toBe(true);
		expect(existsSync(join(directory, 'media', first.asset.thumbnailPath!))).toBe(true);
		expect(duplicate.created).toBe(false);
		expect(duplicate.asset.id).toBe(first.asset.id);
	});

	it('categorizes, tags, and links assets to shots in the same project', async () => {
		const story = new StoryService(db);
		const project = await story.createProject({ title: 'Connections' });
		const episode = await story.createEpisode(project.id, { title: 'Episode' });
		const scene = await story.createScene(episode.id, { title: 'Scene' });
		const shot = await story.createShot(scene.id, { title: 'Shot' });
		const rootId = linked.listRoots()[0]!.id;
		const service = new AssetService(db, linked);
		const { asset } = await service.linkFromConfiguredRoot({ projectId: project.id, rootId, relativePath: 'take-01.mp4' });
		const tag = await service.createTag(project.id, 'approved-look');
		await service.assignTag(asset.id, tag.id);
		await service.linkToShot(asset.id, shot.id, 'output');
		await service.updateAsset(asset.id, { category: 'output-video', notes: 'Preferred motion test' });

		const [saved] = await service.listProjectAssets(project.id);
		expect(saved?.category).toBe('output-video');
		expect(saved?.notes).toBe('Preferred motion test');
		expect(saved?.tagAssignments[0]?.tag.name).toBe('approved-look');
		expect(saved?.shotLinks[0]).toMatchObject({ shotId: shot.id, role: 'output' });
	});

	it('rejects invalid signatures and oversized managed uploads', async () => {
		const validationStorage = new ManagedMediaStorage(join(directory, 'media'), 64);
		await expect(validationStorage.stage(new Blob(['not media']).stream(), 'fake.png')).rejects.toThrow('Unsupported');
		const limitedStorage = new ManagedMediaStorage(join(directory, 'media'), 8);
		await expect(limitedStorage.stage(new Blob(['too many bytes']).stream(), 'large.png')).rejects.toThrow('exceeds');
	});
});
