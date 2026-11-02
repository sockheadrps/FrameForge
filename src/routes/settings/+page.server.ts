import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readConfig } from '#lib/server/config.js';
import { getDatabase } from '#lib/server/db/index.js';
import { getLinkedMediaService } from '#lib/server/media/service.js';
import type { PageServerLoad } from './$types';
const exec = promisify(execFile);
async function version(command: string) {
	try {
		return (await exec(command, ['-version'])).stdout.split(/\r?\n/)[0] || 'available';
	} catch {
		return 'not found';
	}
}
export const load: PageServerLoad = async () => {
	const config = readConfig(process.env);
	const integrity = getDatabase().$client.pragma('integrity_check', { simple: true });
	const counts = {
		projects: (
			getDatabase().$client.prepare('SELECT COUNT(*) value FROM projects').get() as {
				value: number;
			}
		).value,
		assets: (
			getDatabase().$client.prepare('SELECT COUNT(*) value FROM assets').get() as { value: number }
		).value,
		takes: (
			getDatabase().$client.prepare('SELECT COUNT(*) value FROM takes').get() as { value: number }
		).value
	};
	return {
		config: {
			dataDir: config.dataDir,
			databasePath: config.databasePath,
			mediaRoot: config.mediaRoot,
			uploadLimitMb: config.uploadLimitMb
		},
		roots: getLinkedMediaService().listRoots(),
		integrity,
		counts,
		node: process.version,
		ffmpeg: await version('ffmpeg'),
		ffprobe: await version('ffprobe')
	};
};
