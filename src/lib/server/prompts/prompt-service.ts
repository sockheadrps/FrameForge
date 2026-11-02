import { asc, desc, eq, max } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import { promptRevisions, prompts, shotPromptRevisions } from '../db/schema';

const revisionInput = z.object({
	text: z.string().trim().min(1).max(100_000),
	negativePrompt: z.string().trim().max(100_000).default(''),
	modelWorkflow: z.string().trim().max(500).default(''),
	purpose: z.string().trim().max(500).default(''),
	notes: z.string().trim().max(20_000).default('')
});

export class PromptService {
	constructor(private readonly db: FrameForgeDatabase) {}

	listProjectPrompts(projectId: string) {
		return this.db.query.prompts.findMany({
			where: eq(prompts.projectId, projectId),
			orderBy: [asc(prompts.name)],
			with: {
				revisions: { orderBy: [desc(promptRevisions.revisionNumber)], with: { shotLinks: true } }
			}
		});
	}

	createPrompt(projectId: string, name: string, input: unknown) {
		const id = crypto.randomUUID();
		const revision = revisionInput.parse(input);
		const validName = z.string().trim().min(1).max(160).parse(name);
		return this.db.transaction((tx) => {
			tx.insert(prompts)
				.values({ id, projectId: z.string().uuid().parse(projectId), name: validName })
				.run();
			const [created] = tx
				.insert(promptRevisions)
				.values({ id: crypto.randomUUID(), promptId: id, revisionNumber: 1, ...revision })
				.returning()
				.all();
			return created;
		});
	}

	async createRevision(promptId: string, input: unknown) {
		const values = revisionInput.parse(input);
		return this.db.transaction((tx) => {
			const current = tx
				.select({ value: max(promptRevisions.revisionNumber) })
				.from(promptRevisions)
				.where(eq(promptRevisions.promptId, promptId))
				.get();
			const [revision] = tx
				.insert(promptRevisions)
				.values({
					id: crypto.randomUUID(),
					promptId,
					revisionNumber: (current?.value ?? 0) + 1,
					...values
				})
				.returning()
				.all();
			return revision;
		});
	}

	async renamePrompt(id: string, name: string) {
		const [prompt] = await this.db
			.update(prompts)
			.set({ name: z.string().trim().min(1).max(160).parse(name), updatedAt: new Date() })
			.where(eq(prompts.id, z.string().uuid().parse(id)))
			.returning();
		return prompt;
	}

	async duplicatePrompt(id: string) {
		const source = await this.db.query.prompts.findFirst({
			where: eq(prompts.id, z.string().uuid().parse(id)),
			with: { revisions: { orderBy: [desc(promptRevisions.revisionNumber)], limit: 1 } }
		});
		if (!source || !source.revisions[0]) throw new Error('Prompt not found');
		const latest = source.revisions[0];
		return this.createPrompt(source.projectId, `${source.name} copy`, latest);
	}

	async attachRevisionToShot(revisionId: string, shotId: string) {
		const revision = await this.db.query.promptRevisions.findFirst({
			where: eq(promptRevisions.id, z.string().uuid().parse(revisionId)),
			with: { prompt: true }
		});
		const shot = await this.db.query.shots.findFirst({
			where: (table, { eq }) => eq(table.id, z.string().uuid().parse(shotId)),
			with: { scene: { with: { episode: true } } }
		});
		if (!revision || !shot || revision.prompt.projectId !== shot.scene.episode.projectId)
			throw new Error('Prompt revision and shot must belong to the same project');
		await this.db
			.insert(shotPromptRevisions)
			.values({ promptRevisionId: revision.id, shotId: shot.id })
			.onConflictDoNothing();
	}

	async getRevision(id: string) {
		return this.db.query.promptRevisions.findFirst({
			where: eq(promptRevisions.id, z.string().uuid().parse(id))
		});
	}
}
