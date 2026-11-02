import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

describe('readConfig', () => {
	it('derives persistent paths from the configured data directory', () => {
		expect(readConfig({ FRAMEFORGE_DATA_DIR: '/srv/frameforge' })).toEqual({
			dataDir: '/srv/frameforge',
			databasePath: '/srv/frameforge/frameforge.db',
			mediaRoot: '/srv/frameforge/media',
			linkedMediaRoots: [],
			uploadLimitMb: 1024
		});
	});

	it('parses administrator-approved linked media roots', () => {
		expect(
			readConfig({ FRAMEFORGE_LINKED_MEDIA_ROOTS: '/mnt/data/comfy/output;/mnt/archive/renders' })
				.linkedMediaRoots
		).toEqual(['/mnt/data/comfy/output', '/mnt/archive/renders']);
	});
	it('rejects invalid upload limits', () => {
		expect(() => readConfig({ FRAMEFORGE_UPLOAD_LIMIT_MB: '0' })).toThrow(
			'FRAMEFORGE_UPLOAD_LIMIT_MB must be a positive integer'
		);
	});
});
