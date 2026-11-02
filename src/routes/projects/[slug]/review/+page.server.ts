import { error, fail } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { StoryService } from '#lib/server/story/story-service.js';
import { TakeService } from '#lib/server/takes/take-service.js';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params }) => {
	const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const service = new TakeService(getDatabase());
	return {
		project,
		scenes: await Promise.all(
			project.episodes.flatMap((episode) =>
				episode.scenes.map(async (scene) => ({
					id: scene.id,
					label: `${episode.title} / ${scene.title}`,
					shots: await Promise.all(
						scene.shots.map(async (shot) => ({
							id: shot.id,
							title: shot.title,
							targetDurationMs: shot.targetDurationMs,
							approved:
								(await service.listShotTakes(shot.id)).find((take) => take.isPrimary) || null
						}))
					)
				}))
			)
		)
	};
};
export const actions: Actions = {
	markers: async ({ request }) => {
		const data = await request.formData();
		const parse = (key: string) => {
			const value = String(data.get(key) ?? '').trim();
			return value ? Math.round(Number(value) * 1000) : null;
		};
		try {
			await new TakeService(getDatabase()).setMarkers(
				String(data.get('takeId')),
				parse('reviewIn'),
				parse('reviewOut')
			);
			return { success: true, message: 'Review markers saved.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not save markers.'
			});
		}
	}
};
