import { asc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { assets } from '#lib/server/db/schema.js';
import { PromptService } from '#lib/server/prompts/prompt-service.js';
import { StoryService } from '#lib/server/story/story-service.js';
import { TakeService } from '#lib/server/takes/take-service.js';
import type { Actions, PageServerLoad } from './$types';

const value = (data: FormData, key: string) => String(data.get(key) ?? '');
const failure = (cause: unknown) =>
	fail(400, { message: cause instanceof Error ? cause.message : 'Take action failed.' });

export const load: PageServerLoad = async ({ params }) => {
	const db = getDatabase();
	const project = await new StoryService(db).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const shots = project.episodes.flatMap((episode) =>
		episode.scenes.flatMap((scene) =>
			scene.shots.map((shot) => ({
				...shot,
				label: `${episode.title} / ${scene.title} / ${shot.title}`
			}))
		)
	);
	const service = new TakeService(db);
	return {
		project,
		shots: await Promise.all(
			shots.map(async (shot) => ({ ...shot, takes: await service.listShotTakes(shot.id) }))
		),
		assets: await db
			.select()
			.from(assets)
			.where(eq(assets.projectId, project.id))
			.orderBy(asc(assets.originalName)),
		prompts: await new PromptService(db).listProjectPrompts(project.id)
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const inputs = ['startFrameId', 'endFrameId', 'referenceId'].flatMap((key) => {
			const assetId = value(data, key);
			return assetId
				? [
						{
							assetId,
							role: key
								.replace('Id', '')
								.replace(/([A-Z])/g, '-$1')
								.toLowerCase()
						}
					]
				: [];
		});
		try {
			await new TakeService(getDatabase()).create({
				shotId: value(data, 'shotId'),
				outputAssetId: value(data, 'outputAssetId'),
				promptRevisionId: value(data, 'promptRevisionId'),
				name: value(data, 'name'),
				model: value(data, 'model'),
				seed: value(data, 'seed'),
				resolution: value(data, 'resolution'),
				workflow: value(data, 'workflow'),
				reviewNotes: value(data, 'reviewNotes'),
				inputs
			});
			return { success: true, message: 'Take and provenance saved.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	review: async ({ request }) => {
		const data = await request.formData();
		const status = value(data, 'status');
		if (!['candidate', 'approved', 'rejected'].includes(status))
			return fail(400, { message: 'Invalid review status.' });
		try {
			await new TakeService(getDatabase()).setReview(
				value(data, 'takeId'),
				status as 'candidate' | 'approved' | 'rejected',
				value(data, 'reviewNotes')
			);
			return {
				success: true,
				message: status === 'approved' ? 'Primary take approved.' : 'Review saved.'
			};
		} catch (cause) {
			return failure(cause);
		}
	}
};
