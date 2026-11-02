import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { assets } from '../db/schema';
import { StoryService } from '../story/story-service';
import { TakeService } from '../takes/take-service';
import { ContinuityService } from './continuity-service';
describe('ContinuityService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	let story: StoryService;
	let service: ContinuityService;
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-continuity-'));
		db = createDatabase(join(directory, 'test.db'));
		migrateDatabase(db, resolve('drizzle'));
		story = new StoryService(db);
		service = new ContinuityService(db);
	});
	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});
	it('versions references, preserves canonical selection, links story records, and records arcs', async () => {
		const project = await story.createProject({ title: 'Continuity' });
		const episode = await story.createEpisode(project.id, { title: 'Ep' });
		const scene = await story.createScene(episode.id, { title: 'Scene' });
		const shot = await story.createShot(scene.id, { title: 'Shot' });
		const first = crypto.randomUUID();
		const second = crypto.randomUUID();
		await db.insert(assets).values([
			{
				id: first,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'image',
				originalName: 'v1.png',
				mimeType: 'image/png',
				managedPath: 'v1.png',
				sizeBytes: 1
			},
			{
				id: second,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'image',
				originalName: 'v2.png',
				mimeType: 'image/png',
				managedPath: 'v2.png',
				sizeBytes: 1
			}
		]);
		const character = await service.create(project.id, 'character', 'Beemo');
		const v1 = await service.addReference(character.id, first);
		const v2 = await service.addReference(character.id, second);
		await service.setCanonical(character.id, v2.id);
		await service.linkScene(character.id, scene.id);
		await service.linkShot(character.id, shot.id);
		await service.addArcNote(
			character.id,
			'Chooses to protect the rider',
			true,
			episode.id,
			scene.id
		);
		const [loaded] = await service.list(project.id);
		expect(loaded.references.map((item) => item.versionNumber)).toEqual([2, 1]);
		expect(loaded.canonicalReferenceId).toBe(v2.id);
		expect(loaded.sceneLinks).toHaveLength(1);
		expect(loaded.shotLinks).toHaveLength(1);
		expect(loaded.arcNotes[0]).toMatchObject({ turningPoint: true });
		expect(v1.id).not.toBe(v2.id);
	});
	it('records the exact reference version used by a take without changing it when a newer version appears', async () => {
		const project = await story.createProject({ title: 'Lineage' });
		const ep = await story.createEpisode(project.id, { title: 'Ep' });
		const scene = await story.createScene(ep.id, { title: 'Scene' });
		const shot = await story.createShot(scene.id, { title: 'Shot' });
		const ref = crypto.randomUUID();
		const newer = crypto.randomUUID();
		const output = crypto.randomUUID();
		await db.insert(assets).values([
			{
				id: ref,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'image',
				originalName: 'ref.png',
				mimeType: 'image/png',
				managedPath: 'ref.png',
				sizeBytes: 1
			},
			{
				id: newer,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'image',
				originalName: 'new.png',
				mimeType: 'image/png',
				managedPath: 'new.png',
				sizeBytes: 1
			},
			{
				id: output,
				projectId: project.id,
				storageType: 'managed',
				mediaType: 'video',
				originalName: 'out.mp4',
				mimeType: 'video/mp4',
				managedPath: 'out.mp4',
				sizeBytes: 1
			}
		]);
		const entity = await service.create(project.id, 'character', 'Rider');
		const used = await service.addReference(entity.id, ref);
		await new TakeService(db).create({
			shotId: shot.id,
			outputAssetId: output,
			name: 'Take',
			inputs: [{ assetId: ref, role: 'reference' }]
		});
		await service.addReference(entity.id, newer);
		const [take] = await new TakeService(db).listShotTakes(shot.id);
		expect(take.inputs[0]?.worldReferenceVersion?.id).toBe(used.id);
		expect(take.inputs[0]?.worldReferenceVersion?.entity.references[0]?.versionNumber).toBe(2);
	});
});
