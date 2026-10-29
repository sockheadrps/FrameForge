import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

describe('readConfig', () => {
	it('derives persistent paths from the configured data directory', () => {
		expect(readConfig({ FRAMEFORGE_DATA_DIR: '/srv/frameforge' })).toEqual({
			dataDir: '/srv/frameforge',
			databasePath: '/srv/frameforge/frameforge.db',
			mediaRoot: '/srv/frameforge/media',
			uploadLimitMb: 1024
		});
	});
	it('rejects invalid upload limits', () => {
		expect(() => readConfig({ FRAMEFORGE_UPLOAD_LIMIT_MB: '0' })).toThrow(
			'FRAMEFORGE_UPLOAD_LIMIT_MB must be a positive integer'
		);
	});
});
