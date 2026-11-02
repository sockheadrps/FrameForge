import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { PromptService } from '../prompts/prompt-service';
import { StoryService } from '../story/story-service';
import { SearchService } from './search-service';
describe('SearchService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-search-'));
		db = createDatabase(join(directory, 'db.sqlite'));
		migrateDatabase(db, resolve('drizzle'));
	});
	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});
	it('searches story and prompt content within one project', async () => {
		const story = new StoryService(db);
		const project = await story.createProject({ title: 'Search' });
		const ep = await story.createEpisode(project.id, { title: 'Neon Episode' });
		const scene = await story.createScene(ep.id, { title: 'Alley' });
		await story.createShot(scene.id, {
			title: 'Motorcycle pass',
			actionDescription: 'A sideways burst of fire'
		});
		await new PromptService(db).createPrompt(project.id, 'Drive-by', {
			text: 'masked rider in neon rain'
		});
		const search = new SearchService(db);
		expect(search.search(project.id, 'neon').map((item) => item.type)).toEqual(
			expect.arrayContaining(['episode', 'prompt'])
		);
		expect(search.search(project.id, 'sideways')[0]).toMatchObject({
			type: 'shot',
			title: 'Motorcycle pass'
		});
	});
});
