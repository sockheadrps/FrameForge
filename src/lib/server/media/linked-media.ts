import { createHash } from 'node:crypto';
import { createReadStream, existsSync, realpathSync, readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import sharp from 'sharp';

const supportedTypes = new Map([
	['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'],
	['.mp4', 'video/mp4'], ['.webm', 'video/webm']
]);
const execFileAsync = promisify(execFile);

export type LinkedMediaRoot = { id: string; name: string; available: boolean };
export type LinkedMediaEntry = {
	name: string;
	path: string;
	kind: 'directory' | 'image' | 'video';
	mimeType?: string;
	size?: number;
	modifiedAt?: string;
};

function rootId(path: string) {
	return createHash('sha256').update(resolve(path)).digest('hex').slice(0, 12);
}

function assertRelativePath(value: string) {
	if (value.includes('\0') || isAbsolute(value)) throw new Error('Invalid linked-media path');
	const segments = value.replaceAll('\\', '/').split('/').filter(Boolean);
	if (segments.some((segment) => segment === '..' || segment === '.')) throw new Error('Invalid linked-media path');
	return segments.join('/');
}

export class LinkedMediaService {
	private readonly rootsById = new Map<string, string>();

	constructor(roots: string[]) {
		for (const path of roots) this.rootsById.set(rootId(path), resolve(path));
	}

	listRoots(): LinkedMediaRoot[] {
		return [...this.rootsById].map(([id, path]) => ({
			id,
			name: path.split(/[\\/]/).filter(Boolean).at(-1) || path,
			available: existsSync(path)
		}));
	}

	list(root: string, requestedPath = '') {
		const { canonicalRoot, canonicalPath, relativePath } = this.resolveSafePath(root, requestedPath);
		if (!statSync(canonicalPath).isDirectory()) throw new Error('Linked-media path is not a directory');
		const entries = readdirSync(canonicalPath, { withFileTypes: true })
			.flatMap<LinkedMediaEntry>((entry) => {
				const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
				let childPath: string;
				try { childPath = this.assertInsideRoot(canonicalRoot, realpathSync(resolve(canonicalPath, entry.name))); }
				catch { return []; }
				const stats = statSync(childPath);
				if (stats.isDirectory()) return [{ name: entry.name, path: childRelativePath, kind: 'directory', modifiedAt: stats.mtime.toISOString() }];
				const mimeType = supportedTypes.get(extname(entry.name).toLowerCase());
				if (!mimeType || !stats.isFile()) return [];
				return [{ name: entry.name, path: childRelativePath, kind: mimeType.startsWith('image/') ? 'image' : 'video', mimeType, size: stats.size, modifiedAt: stats.mtime.toISOString() }];
			})
			.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === 'directory' ? -1 : b.kind === 'directory' ? 1 : a.name.localeCompare(b.name));
		return { path: relativePath, entries };
	}

	status(root: string, requestedPath: string, expectedSize?: number, expectedModifiedAt?: Date | null) {
		try {
			const { canonicalPath } = this.resolveSafePath(root, requestedPath);
			const stats = statSync(canonicalPath);
			const modified =
				(expectedSize !== undefined && stats.size !== expectedSize) ||
				Boolean(expectedModifiedAt && Math.abs(stats.mtime.getTime() - expectedModifiedAt.getTime()) > 1000);
			return { available: stats.isFile(), modified };
		} catch {
			return { available: false, modified: false };
		}
	}

	open(root: string, requestedPath: string, rangeHeader?: string | null) {
		const { canonicalPath } = this.resolveSafePath(root, requestedPath);
		const stats = statSync(canonicalPath);
		const mimeType = supportedTypes.get(extname(canonicalPath).toLowerCase());
		if (!stats.isFile() || !mimeType) throw new Error('Unsupported linked-media file');

		let start = 0;
		let end = stats.size - 1;
		let partial = false;
		if (rangeHeader) {
			const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
			if (!match) throw new Error('Invalid range');
			start = match[1] ? Number(match[1]) : 0;
			end = match[2] ? Number(match[2]) : end;
			if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= stats.size) throw new Error('Invalid range');
			partial = true;
		}
		const nodeStream = createReadStream(canonicalPath, { start, end });
		return {
			body: Readable.toWeb(nodeStream) as ReadableStream,
			mimeType, size: stats.size, start, end, partial,
			modifiedAt: stats.mtime.toUTCString()
		};
	}

	async describe(root: string, requestedPath: string) {
		const { canonicalPath, relativePath } = this.resolveSafePath(root, requestedPath);
		const stats = statSync(canonicalPath);
		const mimeType = supportedTypes.get(extname(canonicalPath).toLowerCase());
		if (!stats.isFile() || !mimeType) throw new Error('Unsupported linked-media file');
		let width: number | null = null, height: number | null = null, durationMs: number | null = null;
		if (mimeType.startsWith('image/')) {
			const metadata = await sharp(canonicalPath).metadata();
			width = metadata.width ?? null; height = metadata.height ?? null;
		} else {
			try {
				const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', canonicalPath]);
				const probe = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number }>; format?: { duration?: string } };
				width = probe.streams?.[0]?.width ?? null; height = probe.streams?.[0]?.height ?? null;
				durationMs = probe.format?.duration ? Math.round(Number(probe.format.duration) * 1000) : null;
			} catch { /* Keep metadata nullable when ffprobe cannot inspect the source. */ }
		}
		return {
			rootId: root,
			relativePath,
			name: canonicalPath.split(/[\\/]/).at(-1)!,
			mimeType,
			mediaType: mimeType.startsWith('image/') ? ('image' as const) : ('video' as const),
			sizeBytes: stats.size,
			modifiedAt: stats.mtime, width, height, durationMs
		};
	}

	private resolveSafePath(root: string, requestedPath: string) {
		const configuredRoot = this.rootsById.get(root);
		if (!configuredRoot) throw new Error('Unknown linked-media root');
		const relativePath = assertRelativePath(requestedPath);
		if (!existsSync(configuredRoot)) throw new Error('Linked-media root is unavailable');
		const canonicalRoot = realpathSync(configuredRoot);
		const candidate = resolve(canonicalRoot, relativePath);
		if (!existsSync(candidate)) throw new Error('Linked-media path does not exist');
		const canonicalPath = this.assertInsideRoot(canonicalRoot, realpathSync(candidate));
		return { canonicalRoot, canonicalPath, relativePath };
	}

	private assertInsideRoot(canonicalRoot: string, candidate: string) {
		const child = relative(canonicalRoot, candidate);
		if (child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) throw new Error('Linked-media path escapes its configured root');
		return candidate;
	}
}
import { execFile } from 'node:child_process';
