import { and, asc, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import {
	assets,
	characterArcNotes,
	sceneEntities,
	scenes,
	shotEntities,
	shots,
	worldEntities,
	worldReferenceVersions
} from '../db/schema';
export class ContinuityService {
	constructor(private readonly db: FrameForgeDatabase) {}
	list(projectId: string) {
		return this.db.query.worldEntities.findMany({
			where: eq(worldEntities.projectId, projectId),
			orderBy: [asc(worldEntities.type), asc(worldEntities.name)],
			with: {
				references: {
					orderBy: [desc(worldReferenceVersions.versionNumber)],
					with: { asset: true }
				},
				sceneLinks: true,
				shotLinks: true,
				arcNotes: { orderBy: [asc(characterArcNotes.createdAt)] }
			}
		});
	}
	async create(projectId: string, type: string, name: string, description = '') {
		const [entity] = await this.db
			.insert(worldEntities)
			.values({
				id: crypto.randomUUID(),
				projectId: z.string().uuid().parse(projectId),
				type: z.enum(['character', 'location', 'prop']).parse(type),
				name: z.string().trim().min(1).max(200).parse(name),
				description: z.string().trim().max(20_000).parse(description)
			})
			.returning();
		return entity;
	}
	async addReference(entityId: string, assetId: string, notes = '') {
		const entity = await this.db.query.worldEntities.findFirst({
			where: eq(worldEntities.id, entityId)
		});
		const asset = await this.db.query.assets.findFirst({ where: eq(assets.id, assetId) });
		if (!entity || !asset || entity.projectId !== asset.projectId)
			throw new Error('Reference asset must belong to the entity project');
		return this.db.transaction((tx) => {
			const current = tx
				.select({ value: max(worldReferenceVersions.versionNumber) })
				.from(worldReferenceVersions)
				.where(eq(worldReferenceVersions.entityId, entity.id))
				.get();
			const id = crypto.randomUUID();
			const [version] = tx
				.insert(worldReferenceVersions)
				.values({ id, entityId, assetId, versionNumber: (current?.value ?? 0) + 1, notes })
				.returning()
				.all();
			if (!entity.canonicalReferenceId)
				tx.update(worldEntities)
					.set({ canonicalReferenceId: id, updatedAt: new Date() })
					.where(eq(worldEntities.id, entity.id))
					.run();
			return version;
		});
	}
	async setCanonical(entityId: string, referenceId: string) {
		const reference = await this.db.query.worldReferenceVersions.findFirst({
			where: and(
				eq(worldReferenceVersions.id, referenceId),
				eq(worldReferenceVersions.entityId, entityId)
			)
		});
		if (!reference) throw new Error('Reference does not belong to entity');
		await this.db
			.update(worldEntities)
			.set({ canonicalReferenceId: referenceId, updatedAt: new Date() })
			.where(eq(worldEntities.id, entityId));
	}
	async linkScene(entityId: string, sceneId: string) {
		await this.assertSceneProject(entityId, sceneId);
		await this.db.insert(sceneEntities).values({ entityId, sceneId }).onConflictDoNothing();
	}
	async linkShot(entityId: string, shotId: string) {
		const entity = await this.db.query.worldEntities.findFirst({
			where: eq(worldEntities.id, entityId)
		});
		const shot = await this.db.query.shots.findFirst({
			where: eq(shots.id, shotId),
			with: { scene: { with: { episode: true } } }
		});
		if (!entity || !shot || entity.projectId !== shot.scene.episode.projectId)
			throw new Error('Shot must belong to entity project');
		await this.db.insert(shotEntities).values({ entityId, shotId }).onConflictDoNothing();
	}
	async addArcNote(
		entityId: string,
		note: string,
		turningPoint: boolean,
		episodeId?: string,
		sceneId?: string
	) {
		const entity = await this.db.query.worldEntities.findFirst({
			where: eq(worldEntities.id, entityId)
		});
		if (!entity || entity.type !== 'character') throw new Error('Arc notes require a character');
		const [created] = await this.db
			.insert(characterArcNotes)
			.values({
				id: crypto.randomUUID(),
				entityId,
				note: z.string().trim().min(1).max(20_000).parse(note),
				turningPoint,
				episodeId: episodeId || null,
				sceneId: sceneId || null
			})
			.returning();
		return created;
	}
	private async assertSceneProject(entityId: string, sceneId: string) {
		const entity = await this.db.query.worldEntities.findFirst({
			where: eq(worldEntities.id, entityId)
		});
		const scene = await this.db.query.scenes.findFirst({
			where: eq(scenes.id, sceneId),
			with: { episode: true }
		});
		if (!entity || !scene || entity.projectId !== scene.episode.projectId)
			throw new Error('Scene must belong to entity project');
	}
}
