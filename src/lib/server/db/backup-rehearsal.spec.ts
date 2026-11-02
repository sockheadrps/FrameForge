import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, migrateDatabase } from '.';
import { StoryService } from '../story/story-service';
describe('backup, restore, and upgrade rehearsal', () => {
	let directory = '';
	afterEach(() => {
		if (directory) rmSync(directory, { recursive: true, force: true });
	});
	it('restores a consistent SQLite snapshot and reapplies current migrations', async () => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-rehearsal-'));
		const live = createDatabase(join(directory, 'live.db'));
		migrateDatabase(live, resolve('drizzle'));
		const project = await new StoryService(live).createProject({ title: 'Restore marker' });
		const backup = join(directory, 'snapshot.db');
		await live.$client.backup(backup);
		live.$client.close();
		const restored = createDatabase(backup);
		migrateDatabase(restored, resolve('drizzle'));
		expect((await new StoryService(restored).getProject(project.id))?.title).toBe('Restore marker');
		expect(restored.$client.pragma('integrity_check', { simple: true })).toBe('ok');
		restored.$client.close();
	});
});
