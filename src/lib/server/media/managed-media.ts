import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream, createWriteStream, existsSync, mkdirSync, openSync, realpathSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';
import sharp from 'sharp';

export type StagedUpload = {
	tempPath: string; originalName: string; mimeType: string; mediaType: 'image' | 'video';
	extension: string; sizeBytes: number; contentHash: string; width: number | null; height: number | null;
	durationMs: number | null; thumbnailTempPath: string | null;
};

const execFileAsync = promisify(execFile);

function detectType(header: Buffer) {
	if (header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mimeType: 'image/png', extension: '.png', mediaType: 'image' as const };
	if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return { mimeType: 'image/jpeg', extension: '.jpg', mediaType: 'image' as const };
	if (header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP') return { mimeType: 'image/webp', extension: '.webp', mediaType: 'image' as const };
	if (header.subarray(4, 8).toString('ascii') === 'ftyp') return { mimeType: 'video/mp4', extension: '.mp4', mediaType: 'video' as const };
	if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { mimeType: 'video/webm', extension: '.webm', mediaType: 'video' as const };
	throw new Error('Unsupported or invalid media file');
}

export class ManagedMediaStorage {
	private readonly root: string;
	constructor(root: string, private readonly maxBytes: number) { this.root = resolve(root); }

	async stage(body: ReadableStream<Uint8Array> | null, suppliedName: string): Promise<StagedUpload> {
		if (!body) throw new Error('Upload body is empty');
		mkdirSync(resolve(this.root, '.staging'), { recursive: true });
		const tempPath = resolve(this.root, '.staging', `${randomUUID()}.upload`);
		const writer = createWriteStream(tempPath, { fd: openSync(tempPath, 'wx') });
		const hash = createHash('sha256');
		let sizeBytes = 0;
		let header = Buffer.alloc(0);
		try {
			const reader = body.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = Buffer.from(value);
				sizeBytes += chunk.length;
				if (sizeBytes > this.maxBytes) throw new Error(`Upload exceeds the ${Math.floor(this.maxBytes / 1024 / 1024)} MB limit`);
				hash.update(chunk);
				if (header.length < 16) header = Buffer.concat([header, chunk]).subarray(0, 16);
				if (!writer.write(chunk)) await once(writer, 'drain');
			}
			writer.end();
			await once(writer, 'finish');
			if (!sizeBytes) throw new Error('Upload body is empty');
			const type = detectType(header);
			let width: number | null = null, height: number | null = null, durationMs: number | null = null;
			const thumbnailTempPath = `${tempPath}.thumb.jpg`;
			if (type.mediaType === 'image') {
				const metadata = await sharp(tempPath).metadata();
				width = metadata.width ?? null; height = metadata.height ?? null;
				await sharp(tempPath).rotate().resize(480, 270, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(thumbnailTempPath);
			} else {
				try {
					const { stdout } = await execFileAsync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', tempPath]);
					const probe = JSON.parse(stdout) as { streams?: Array<{ width?: number; height?: number }>; format?: { duration?: string } };
					width = probe.streams?.[0]?.width ?? null; height = probe.streams?.[0]?.height ?? null;
					durationMs = probe.format?.duration ? Math.round(Number(probe.format.duration) * 1000) : null;
					await execFileAsync('ffmpeg', ['-v', 'error', '-i', tempPath, '-frames:v', '1', '-vf', 'scale=480:270:force_original_aspect_ratio=decrease', '-y', thumbnailTempPath]);
				} catch { /* Metadata remains optional when FFmpeg is unavailable or the file is incomplete. */ }
			}
			return { tempPath, originalName: basename(suppliedName).slice(0, 255) || `upload${type.extension}`, ...type, sizeBytes, contentHash: hash.digest('hex'), width, height, durationMs, thumbnailTempPath: existsSync(thumbnailTempPath) ? thumbnailTempPath : null };
		} catch (cause) {
			writer.destroy(); rmSync(tempPath, { force: true }); throw cause;
		}
	}

	commit(staged: StagedUpload, projectId: string) {
		const relativePath = `${projectId}/${staged.contentHash}${staged.extension}`;
		const destination = resolve(this.root, relativePath);
		mkdirSync(dirname(destination), { recursive: true });
		if (existsSync(destination)) rmSync(staged.tempPath, { force: true });
		else renameSync(staged.tempPath, destination);
		let thumbnailPath: string | null = null;
		if (staged.thumbnailTempPath && existsSync(staged.thumbnailTempPath)) {
			thumbnailPath = `${projectId}/thumbnails/${staged.contentHash}.jpg`;
			const thumbnailDestination = resolve(this.root, thumbnailPath);
			mkdirSync(dirname(thumbnailDestination), { recursive: true });
			if (existsSync(thumbnailDestination)) rmSync(staged.thumbnailTempPath, { force: true });
			else renameSync(staged.thumbnailTempPath, thumbnailDestination);
		}
		return { managedPath: relativePath.replaceAll('\\', '/'), thumbnailPath };
	}

	discard(staged: StagedUpload) { rmSync(staged.tempPath, { force: true }); if (staged.thumbnailTempPath) rmSync(staged.thumbnailTempPath, { force: true }); }

	status(relativePath: string | null, expectedSize: number) {
		if (!relativePath) return { available: false, modified: false };
		try {
			const stats = statSync(resolve(this.root, relativePath));
			return { available: stats.isFile(), modified: stats.size !== expectedSize };
		} catch {
			return { available: false, modified: false };
		}
	}

	open(relativePath: string, rangeHeader?: string | null) {
		if (!relativePath || isAbsolute(relativePath) || relativePath.split(/[\\/]/).some((part) => part === '..')) throw new Error('Invalid managed-media path');
		const candidate = resolve(this.root, relativePath);
		if (!existsSync(candidate)) throw new Error('Managed media is missing');
		const canonicalRoot = realpathSync(this.root), canonicalPath = realpathSync(candidate);
		const child = relative(canonicalRoot, canonicalPath);
		if (child.startsWith(`..${sep}`) || child === '..' || isAbsolute(child)) throw new Error('Managed-media path escapes storage');
		const stats = statSync(canonicalPath);
		const mimeTypes: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.webm': 'video/webm' };
		const mimeType = mimeTypes[extname(canonicalPath).toLowerCase()];
		if (!stats.isFile() || !mimeType) throw new Error('Unsupported managed media');
		let start = 0, end = stats.size - 1, partial = false;
		if (rangeHeader) {
			const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
			if (!match) throw new Error('Invalid range');
			start = match[1] ? Number(match[1]) : 0; end = match[2] ? Number(match[2]) : end;
			if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end >= stats.size) throw new Error('Invalid range');
			partial = true;
		}
		return { body: Readable.toWeb(createReadStream(canonicalPath, { start, end })) as ReadableStream, mimeType, size: stats.size, start, end, partial, modifiedAt: stats.mtime.toUTCString() };
	}
}
