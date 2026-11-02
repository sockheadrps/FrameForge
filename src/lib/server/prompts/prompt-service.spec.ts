import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase, type FrameForgeDatabase } from '../db';
import { promptRevisions, shotPromptRevisions } from '../db/schema';
import { StoryService } from '../story/story-service';
import { PromptService } from './prompt-service';

describe('PromptService', () => {
	let directory: string;
	let db: FrameForgeDatabase;
	let prompts: PromptService;
	let story: StoryService;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-prompts-'));
		db = createDatabase(join(directory, 'test.db'));
		migrateDatabase(db, resolve('drizzle'));
		prompts = new PromptService(db);
		story = new StoryService(db);
	});

	afterEach(() => {
		db.$client.close();
		rmSync(directory, { recursive: true, force: true });
	});

	async function makeShot(projectTitle = 'Prompt test') {
		const project = await story.createProject({ title: projectTitle });
		const episode = await story.createEpisode(project.id, { title: 'Episode' });
		const scene = await story.createScene(episode.id, { title: 'Scene' });
		const shot = await story.createShot(scene.id, { title: 'Shot' });
		return { project, shot };
	}

	it('creates immutable revisions and preserves history in newest-first order', async () => {
		const { project } = await makeShot();
		const first = await prompts.createPrompt(project.id, 'Rainy alley', {
			text: 'Wide shot in heavy rain',
			modelWorkflow: 'Flux / cinematic',
			purpose: 'Establishing frame'
		});
		const second = await prompts.createRevision(first.promptId, {
			text: 'Wide shot in heavy rain, neon reflections',
			negativePrompt: 'daylight'
		});

		expect(second.revisionNumber).toBe(2);
		expect((await prompts.getRevision(first.id))?.text).toBe('Wide shot in heavy rain');
		const [prompt] = await prompts.listProjectPrompts(project.id);
		expect(prompt.revisions.map((revision) => revision.revisionNumber)).toEqual([2, 1]);
	});

	it('duplicates the latest revision without changing the source history', async () => {
		const { project } = await makeShot();
		const first = await prompts.createPrompt(project.id, 'Hero frame', { text: 'Version one' });
		await prompts.createRevision(first.promptId, { text: 'Version two' });
		await prompts.renamePrompt(first.promptId, 'Hero close-up');
		await prompts.duplicatePrompt(first.promptId);

		const results = await prompts.listProjectPrompts(project.id);
		expect(results).toHaveLength(2);
		expect(results.find((item) => item.name.endsWith('copy'))?.revisions[0]?.text).toBe(
			'Version two'
		);
		expect(await db.select().from(promptRevisions)).toHaveLength(3);
	});

	it('attaches an exact revision to a shot and rejects cross-project lineage', async () => {
		const firstProject = await makeShot('First project');
		const otherProject = await makeShot('Other project');
		const revision = await prompts.createPrompt(firstProject.project.id, 'Lineage', {
			text: 'Exact text'
		});

		await prompts.attachRevisionToShot(revision.id, firstProject.shot.id);
		expect(await db.select().from(shotPromptRevisions)).toEqual([
			{ shotId: firstProject.shot.id, promptRevisionId: revision.id }
		]);
		await expect(prompts.attachRevisionToShot(revision.id, otherProject.shot.id)).rejects.toThrow(
			'same project'
		);
	});
});
