import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { assets } from '../db/schema';
import { StoryService } from '../story/story-service';
import { CanvasService } from './canvas-service';
describe('CanvasService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	let canvas: CanvasService;
	let story: StoryService;
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-canvas-'));
		db = createDatabase(join(directory, 'test.db'));
		migrateDatabase(db, resolve('drizzle'));
		canvas = new CanvasService(db);
		story = new StoryService(db);
	});
	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});
	it('persists nodes, typed edges, positions, and viewport', async () => {
		const project = await story.createProject({ title: 'Canvas persistence' });
		const board = await canvas.getOrCreate(project.id);
		if (!board) throw new Error('missing canvas');
		const first = await canvas.addNode(board.id, { type: 'note', label: 'Idea', x: 10, y: 20 });
		const second = await canvas.addNode(board.id, {
			type: 'group',
			label: 'Sequence',
			x: 300,
			y: 100
		});
		await canvas.addEdge(board.id, first.id, second.id, 'inspired-by');
		await canvas.moveNode(first.id, 88, 99);
		await canvas.setParent(first.id, second.id);
		await canvas.setViewport(board.id, { x: -42, y: 16, zoom: 1.4 });
		const restored = await canvas.get(board.id);
		expect(restored?.nodes.find((node) => node.id === first.id)).toMatchObject({
			x: 88,
			y: 99,
			parentId: second.id
		});
		expect(restored?.edges[0]?.type).toBe('inspired-by');
		expect(restored?.viewportZoom).toBe(1400);
	});
	it('removes only the visual node and preserves its canonical record', async () => {
		const project = await story.createProject({ title: 'Safe deletion' });
		const assetId = crypto.randomUUID();
		await db.insert(assets).values({
			id: assetId,
			projectId: project.id,
			storageType: 'managed',
			mediaType: 'image',
			originalName: 'source.png',
			mimeType: 'image/png',
			managedPath: 'source.png',
			sizeBytes: 10
		});
		const board = await canvas.getOrCreate(project.id);
		if (!board) throw new Error('missing canvas');
		const node = await canvas.addNode(board.id, {
			type: 'asset',
			recordId: assetId,
			label: 'source.png',
			x: 0,
			y: 0
		});
		await canvas.deleteNode(node.id);
		expect(await db.query.assets.findFirst()).toMatchObject({ id: assetId });
		expect((await canvas.get(board.id))?.nodes).toHaveLength(0);
	});
	it('supports separate project and scene canvases', async () => {
		const project = await story.createProject({ title: 'Canvas scopes' });
		const episode = await story.createEpisode(project.id, { title: 'Ep' });
		const scene = await story.createScene(episode.id, { title: 'Scene' });
		const projectBoard = await canvas.getOrCreate(project.id);
		const sceneBoard = await canvas.getOrCreate(project.id, scene.id);
		expect(sceneBoard?.id).not.toBe(projectBoard?.id);
		expect((await canvas.getOrCreate(project.id, scene.id))?.id).toBe(sceneBoard?.id);
	});
});
