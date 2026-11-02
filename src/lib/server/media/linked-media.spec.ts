import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LinkedMediaService } from './linked-media';

describe('LinkedMediaService', () => {
	let directory: string;
	let root: string;
	let outside: string;
	let service: LinkedMediaService;
	let rootId: string;

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), 'frameforge-media-'));
		root = join(directory, 'output');
		outside = join(directory, 'outside');
		mkdirSync(join(root, 'episode-01'), { recursive: true });
		mkdirSync(outside);
		writeFileSync(join(root, 'frame.png'), Buffer.from([1, 2, 3, 4]));
		writeFileSync(join(root, 'clip.mp4'), Buffer.from([0, 1, 2, 3, 4, 5, 6]));
		writeFileSync(join(root, 'workflow.json'), '{}');
		writeFileSync(join(root, 'episode-01', 'take.webp'), Buffer.from([5, 6]));
		writeFileSync(join(outside, 'secret.png'), Buffer.from([9]));
		symlinkSync(outside, join(root, 'escape'), 'junction');
		service = new LinkedMediaService([root]);
		rootId = service.listRoots()[0]!.id;
	});

	afterEach(() => rmSync(directory, { recursive: true, force: true }));

	it('lists supported media and preserves nested folder paths', () => {
		const listing = service.list(rootId);
		expect(listing.entries.map((entry) => entry.name)).toEqual(['episode-01', 'clip.mp4', 'frame.png']);
		expect(listing.entries.some((entry) => entry.name === 'workflow.json')).toBe(false);
		expect(listing.entries.some((entry) => entry.name === 'escape')).toBe(false);
		expect(service.list(rootId, 'episode-01').entries[0]?.path).toBe('episode-01/take.webp');
	});

	it('rejects traversal and symlink escapes', () => {
		expect(() => service.list(rootId, '../outside')).toThrow('Invalid linked-media path');
		expect(() => service.list(rootId, 'escape')).toThrow('escapes its configured root');
	});

	it('opens supported files and honors valid byte ranges', () => {
		const file = service.open(rootId, 'clip.mp4', 'bytes=2-4');
		expect(file.mimeType).toBe('video/mp4');
		expect(file.partial).toBe(true);
		expect([file.start, file.end, file.size]).toEqual([2, 4, 7]);
		expect(() => service.open(rootId, 'clip.mp4', 'bytes=5-20')).toThrow('Invalid range');
	});
});
