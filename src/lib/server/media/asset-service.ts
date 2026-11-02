import { and, asc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import { assets, assetTags, shotAssets, tags } from '../db/schema';
import type { LinkedMediaService } from './linked-media';
import type { ManagedMediaStorage, StagedUpload } from './managed-media';

const linkedAssetInput = z.object({
	projectId: z.string().uuid(),
	rootId: z.string().regex(/^[a-f0-9]{12}$/),
	relativePath: z.string().min(1).max(4096)
});

export class AssetService {
	constructor(
		private readonly db: FrameForgeDatabase,
		private readonly linkedMedia: LinkedMediaService,
		private readonly managedMedia?: ManagedMediaStorage
	) {}

	async listProjectAssets(projectId: string, options: { limit?: number; offset?: number } = {}) {
		const records = await this.db.query.assets.findMany({
			where: eq(assets.projectId, projectId), orderBy: [asc(assets.originalName)],
			limit: options.limit,
			offset: options.offset,
			with: { tagAssignments: { with: { tag: true } }, shotLinks: true }
		});
		return records.map((asset) => ({
			...asset,
			sourceStatus:
				asset.storageType === 'linked' && asset.linkedRootId && asset.linkedRelativePath
					? this.linkedMedia.status(asset.linkedRootId, asset.linkedRelativePath, asset.sizeBytes, asset.sourceModifiedAt)
					: this.managedMedia
						? this.managedMedia.status(asset.managedPath, asset.sizeBytes)
						: { available: true, modified: false }
		}));
	}

	listProjectTags(projectId: string) {
		return this.db.select().from(tags).where(eq(tags.projectId, projectId)).orderBy(asc(tags.name));
	}

	async updateAsset(id: string, input: unknown) {
		const values = z.object({
			category: z.enum(['general', 'character', 'location', 'prop', 'style', 'start-frame', 'end-frame', 'source', 'output-image', 'output-video']),
			notes: z.string().trim().max(10_000)
		}).parse(input);
		const [asset] = await this.db.update(assets).set({ ...values, updatedAt: new Date() }).where(eq(assets.id, z.string().uuid().parse(id))).returning();
		return asset;
	}

	async createTag(projectId: string, name: string) {
		const values = { projectId: z.string().uuid().parse(projectId), name: z.string().trim().min(1).max(80).parse(name) };
		const existing = await this.db.query.tags.findFirst({ where: and(eq(tags.projectId, values.projectId), eq(tags.name, values.name)) });
		if (existing) return existing;
		const [tag] = await this.db.insert(tags).values({ id: crypto.randomUUID(), ...values }).returning();
		return tag;
	}

	async assignTag(assetId: string, tagId: string) {
		const asset = await this.getAsset(assetId);
		const tag = await this.db.query.tags.findFirst({ where: eq(tags.id, z.string().uuid().parse(tagId)) });
		if (!asset || !tag || asset.projectId !== tag.projectId) throw new Error('Asset and tag must belong to the same project');
		await this.db.insert(assetTags).values({ assetId: asset.id, tagId: tag.id }).onConflictDoNothing();
	}

	async linkToShot(assetId: string, shotId: string, role: string) {
		const asset = await this.getAsset(assetId);
		const shot = await this.db.query.shots.findFirst({ where: (table, { eq }) => eq(table.id, z.string().uuid().parse(shotId)), with: { scene: { with: { episode: true } } } });
		if (!asset || !shot || asset.projectId !== shot.scene.episode.projectId) throw new Error('Asset and shot must belong to the same project');
		const [last] = await this.db.select({ value: max(shotAssets.position) }).from(shotAssets).where(eq(shotAssets.shotId, shot.id));
		await this.db.insert(shotAssets).values({ shotId: shot.id, assetId: asset.id, role: z.string().trim().min(1).max(80).parse(role), position: (last?.value ?? -1) + 1 }).onConflictDoUpdate({ target: [shotAssets.shotId, shotAssets.assetId], set: { role } });
	}

	async linkFromConfiguredRoot(input: z.input<typeof linkedAssetInput>) {
		const values = linkedAssetInput.parse(input);
		const source = await this.linkedMedia.describe(values.rootId, values.relativePath);
		const existing = await this.db.query.assets.findFirst({
			where: and(eq(assets.projectId, values.projectId), eq(assets.linkedRootId, source.rootId), eq(assets.linkedRelativePath, source.relativePath))
		});
		if (existing) return { asset: existing, created: false };
		const [asset] = await this.db.insert(assets).values({
			id: crypto.randomUUID(), projectId: values.projectId, storageType: 'linked',
			mediaType: source.mediaType, originalName: source.name, mimeType: source.mimeType,
			linkedRootId: source.rootId, linkedRelativePath: source.relativePath,
			sizeBytes: source.sizeBytes, sourceModifiedAt: source.modifiedAt,
			width: source.width, height: source.height, durationMs: source.durationMs
		}).returning();
		return { asset, created: true };
	}

	async importManaged(projectId: string, staged: StagedUpload, storage: ManagedMediaStorage) {
		const validProjectId = z.string().uuid().parse(projectId);
		const existing = await this.db.query.assets.findFirst({
			where: and(eq(assets.projectId, validProjectId), eq(assets.contentHash, staged.contentHash))
		});
		if (existing) {
			storage.discard(staged);
			return { asset: existing, created: false };
		}
		const stored = storage.commit(staged, validProjectId);
		try {
			const [asset] = await this.db.insert(assets).values({
				id: crypto.randomUUID(), projectId: validProjectId, storageType: 'managed',
				mediaType: staged.mediaType, originalName: staged.originalName, mimeType: staged.mimeType,
				managedPath: stored.managedPath, thumbnailPath: stored.thumbnailPath,
				sizeBytes: staged.sizeBytes, width: staged.width, height: staged.height,
				durationMs: staged.durationMs, contentHash: staged.contentHash
			}).returning();
			return { asset, created: true };
		} catch (cause) {
			throw cause;
		}
	}

	getAsset(id: string) {
		return this.db.query.assets.findFirst({ where: eq(assets.id, z.string().uuid().parse(id)) });
	}

	deleteAsset(id: string) {
		return this.db.delete(assets).where(eq(assets.id, z.string().uuid().parse(id)));
	}
}
