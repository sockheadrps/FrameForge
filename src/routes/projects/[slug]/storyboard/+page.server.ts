import { error, fail } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { StoryService } from '#lib/server/story/story-service.js';
import { TakeService } from '#lib/server/takes/take-service.js';
import type { Actions, PageServerLoad } from './$types';

const text = (data: FormData, key: string) => String(data.get(key) ?? '');
const failure = (cause: unknown) =>
	fail(400, { message: cause instanceof Error ? cause.message : 'Storyboard action failed.' });
export const load: PageServerLoad = async ({ params }) => {
	const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const takes = new TakeService(getDatabase());
	return {
		project: {
			...project,
			episodes: await Promise.all(
				project.episodes.map(async (episode) => ({
					...episode,
					scenes: await Promise.all(
						episode.scenes.map(async (scene) => ({
							...scene,
							shots: await Promise.all(
								scene.shots.map(async (shot) => ({
									...shot,
									takes: await takes.listShotTakes(shot.id)
								}))
							)
						}))
					)
				}))
			)
		}
	};
};
export const actions: Actions = {
	reorder: async ({ request }) => {
		const data = await request.formData();
		try {
			await new StoryService(getDatabase()).reorderShots(
				text(data, 'sceneId'),
				JSON.parse(text(data, 'orderedIds'))
			);
			return { success: true, message: 'Canonical shot order updated.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	update: async ({ request }) => {
		const data = await request.formData();
		try {
			await new StoryService(getDatabase()).updateShot(text(data, 'id'), {
				title: text(data, 'title'),
				actionDescription: text(data, 'actionDescription'),
				cameraFraming: text(data, 'cameraFraming'),
				cameraMovement: text(data, 'cameraMovement'),
				targetDurationMs: Number(data.get('targetDurationMs') ?? 0),
				dialogue: text(data, 'dialogue'),
				continuityNotes: text(data, 'continuityNotes'),
				status: text(data, 'status') as 'planned'
			});
			return { success: true, message: 'Shot updated.' };
		} catch (cause) {
			return failure(cause);
		}
	}
};
