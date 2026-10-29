import { error, fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { getDatabase } from '#lib/server/db/index.js';
import { parseOrderedIds, StoryService } from '#lib/server/story/story-service.js';
import type { Actions, PageServerLoad } from './$types';

const service = () => new StoryService(getDatabase());
const text = (data: FormData, key: string) => String(data.get(key) ?? '');
const failure = (cause: unknown) => {
	if (cause instanceof ZodError)
		return fail(400, { message: cause.issues[0]?.message ?? 'Check the form fields.' });
	throw cause;
};

export const load: PageServerLoad = async ({ params }) => {
	const project = await service().getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	return { project };
};

export const actions: Actions = {
	updateProject: async ({ request, params }) => {
		const data = await request.formData();
		const project = await service().getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		try {
			await service().updateProject(project.id, {
				title: text(data, 'title'),
				logline: text(data, 'logline'),
				synopsis: text(data, 'synopsis'),
				genre: text(data, 'genre'),
				visualStyle: text(data, 'visualStyle'),
				status: text(data, 'status') as 'concept'
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	deleteProject: async ({ params }) => {
		const project = await service().getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		await service().deleteProject(project.id);
		redirect(303, '/projects');
	},
	createEpisode: async ({ request, params }) => {
		const data = await request.formData();
		const project = await service().getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		try {
			await service().createEpisode(project.id, {
				title: text(data, 'title'),
				synopsis: text(data, 'synopsis')
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	updateEpisode: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().updateEpisode(text(data, 'id'), {
				title: text(data, 'title'),
				synopsis: text(data, 'synopsis')
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	deleteEpisode: async ({ request }) => {
		const data = await request.formData();
		await service().deleteEpisode(text(data, 'id'));
		return { success: true };
	},
	createScene: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().createScene(text(data, 'episodeId'), {
				title: text(data, 'title'),
				description: text(data, 'description'),
				location: text(data, 'location'),
				narrativeNotes: text(data, 'narrativeNotes')
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	updateScene: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().updateScene(text(data, 'id'), {
				title: text(data, 'title'),
				description: text(data, 'description'),
				location: text(data, 'location'),
				narrativeNotes: text(data, 'narrativeNotes')
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	deleteScene: async ({ request }) => {
		const data = await request.formData();
		await service().deleteScene(text(data, 'id'));
		return { success: true };
	},
	createShot: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().createShot(text(data, 'sceneId'), {
				title: text(data, 'title'),
				actionDescription: text(data, 'actionDescription'),
				cameraFraming: text(data, 'cameraFraming'),
				cameraMovement: text(data, 'cameraMovement'),
				targetDurationMs: Number(data.get('targetDurationMs') ?? 0),
				dialogue: text(data, 'dialogue'),
				continuityNotes: text(data, 'continuityNotes'),
				status: text(data, 'status') as 'planned'
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	updateShot: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().updateShot(text(data, 'id'), {
				title: text(data, 'title'),
				actionDescription: text(data, 'actionDescription'),
				cameraFraming: text(data, 'cameraFraming'),
				cameraMovement: text(data, 'cameraMovement'),
				targetDurationMs: Number(data.get('targetDurationMs') ?? 0),
				dialogue: text(data, 'dialogue'),
				continuityNotes: text(data, 'continuityNotes'),
				status: text(data, 'status') as 'planned'
			});
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	deleteShot: async ({ request }) => {
		const data = await request.formData();
		await service().deleteShot(text(data, 'id'));
		return { success: true };
	},
	reorderEpisodes: async ({ request, params }) => {
		const data = await request.formData();
		const project = await service().getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		try {
			await service().reorderEpisodes(
				project.id,
				parseOrderedIds(JSON.parse(text(data, 'orderedIds')))
			);
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	reorderScenes: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().reorderScenes(
				text(data, 'parentId'),
				parseOrderedIds(JSON.parse(text(data, 'orderedIds')))
			);
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	},
	reorderShots: async ({ request }) => {
		const data = await request.formData();
		try {
			await service().reorderShots(
				text(data, 'parentId'),
				parseOrderedIds(JSON.parse(text(data, 'orderedIds')))
			);
			return { success: true };
		} catch (cause) {
			return failure(cause);
		}
	}
};
