import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import {
	assets,
	promptRevisions,
	prompts,
	shots,
	takeInputs,
	takes,
	worldReferenceVersions
} from '../db/schema';

const createInput = z.object({
	shotId: z.string().uuid(),
	outputAssetId: z.string().uuid(),
	promptRevisionId: z.string().uuid().optional().or(z.literal('')),
	name: z.string().trim().min(1).max(160),
	reviewNotes: z.string().trim().max(20_000).default(''),
	model: z.string().trim().max(500).default(''),
	seed: z.string().trim().max(200).default(''),
	resolution: z.string().trim().max(100).default(''),
	workflow: z.string().trim().max(500).default(''),
	inputs: z
		.array(z.object({ assetId: z.string().uuid(), role: z.string().trim().min(1).max(100) }))
		.default([])
});

export class TakeService {
	constructor(private readonly db: FrameForgeDatabase) {}

	listShotTakes(shotId: string) {
		return this.db.query.takes.findMany({
			where: eq(takes.shotId, shotId),
			orderBy: [asc(takes.createdAt)],
			with: {
				outputAsset: true,
				promptRevision: true,
				inputs: {
					orderBy: [asc(takeInputs.position)],
					with: {
						asset: true,
						worldReferenceVersion: {
							with: {
								entity: {
									with: { references: { orderBy: [desc(worldReferenceVersions.versionNumber)] } }
								}
							}
						}
					}
				}
			}
		});
	}

	async create(input: unknown) {
		const value = createInput.parse(input);
		const shot = await this.db.query.shots.findFirst({
			where: eq(shots.id, value.shotId),
			with: { scene: { with: { episode: true } } }
		});
		if (!shot) throw new Error('Shot not found');
		const projectId = shot.scene.episode.projectId;
		const assetIds = [value.outputAssetId, ...value.inputs.map((item) => item.assetId)];
		const records = await Promise.all(
			assetIds.map((id) => this.db.query.assets.findFirst({ where: eq(assets.id, id) }))
		);
		if (records.some((asset) => !asset || asset.projectId !== projectId))
			throw new Error('All take assets must belong to the shot project');
		if (value.promptRevisionId) {
			const revision = await this.db
				.select({ projectId: prompts.projectId })
				.from(promptRevisions)
				.innerJoin(prompts, eq(promptRevisions.promptId, prompts.id))
				.where(eq(promptRevisions.id, value.promptRevisionId))
				.get();
			if (!revision || revision.projectId !== projectId)
				throw new Error('Prompt revision must belong to the shot project');
		}
		const id = crypto.randomUUID();
		const referenceVersions = await Promise.all(
			value.inputs.map((item) =>
				this.db.query.worldReferenceVersions.findFirst({
					where: eq(worldReferenceVersions.assetId, item.assetId),
					orderBy: [desc(worldReferenceVersions.versionNumber)]
				})
			)
		);
		return this.db.transaction((tx) => {
			const [created] = tx
				.insert(takes)
				.values({
					id,
					shotId: value.shotId,
					outputAssetId: value.outputAssetId,
					promptRevisionId: value.promptRevisionId || null,
					name: value.name,
					reviewNotes: value.reviewNotes,
					model: value.model,
					seed: value.seed,
					resolution: value.resolution,
					workflow: value.workflow
				})
				.returning()
				.all();
			if (value.inputs.length)
				tx.insert(takeInputs)
					.values(
						value.inputs.map((item, position) => ({
							takeId: id,
							assetId: item.assetId,
							role: item.role,
							position,
							worldReferenceVersionId: referenceVersions[position]?.id ?? null
						}))
					)
					.run();
			return created;
		});
	}

	async setReview(id: string, status: 'candidate' | 'approved' | 'rejected', reviewNotes: string) {
		const take = await this.db.query.takes.findFirst({
			where: eq(takes.id, z.string().uuid().parse(id))
		});
		if (!take) throw new Error('Take not found');
		return this.db.transaction((tx) => {
			if (status === 'approved')
				tx.update(takes)
					.set({ status: 'candidate', isPrimary: false, updatedAt: new Date() })
					.where(eq(takes.shotId, take.shotId))
					.run();
			const [updated] = tx
				.update(takes)
				.set({
					status,
					isPrimary: status === 'approved',
					reviewNotes: z.string().trim().max(20_000).parse(reviewNotes),
					updatedAt: new Date()
				})
				.where(eq(takes.id, take.id))
				.returning()
				.all();
			return updated;
		});
	}
	async setMarkers(id: string, reviewInMs: number | null, reviewOutMs: number | null) {
		if (reviewInMs !== null && reviewInMs < 0) throw new Error('In marker cannot be negative');
		if (reviewOutMs !== null && reviewOutMs < 0) throw new Error('Out marker cannot be negative');
		if (reviewInMs !== null && reviewOutMs !== null && reviewOutMs <= reviewInMs)
			throw new Error('Out marker must follow in marker');
		await this.db
			.update(takes)
			.set({ reviewInMs, reviewOutMs, updatedAt: new Date() })
			.where(eq(takes.id, z.string().uuid().parse(id)));
	}
}
