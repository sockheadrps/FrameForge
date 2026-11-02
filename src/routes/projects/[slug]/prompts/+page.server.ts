import { error, fail } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { getDatabase } from '#lib/server/db/index.js';
import { PromptService } from '#lib/server/prompts/prompt-service.js';
import { StoryService } from '#lib/server/story/story-service.js';
import type { Actions, PageServerLoad } from './$types';

const text = (data: FormData, key: string) => String(data.get(key) ?? '');
const revisionValues = (data: FormData) => ({
	text: text(data, 'text'),
	negativePrompt: text(data, 'negativePrompt'),
	modelWorkflow: text(data, 'modelWorkflow'),
	purpose: text(data, 'purpose'),
	notes: text(data, 'notes')
});
const handle = (cause: unknown) =>
	fail(400, {
		message:
			cause instanceof ZodError
				? cause.issues[0]?.message
				: cause instanceof Error
					? cause.message
					: 'Prompt action failed.'
	});

export const load: PageServerLoad = async ({ params }) => {
	const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	return {
		project,
		prompts: await new PromptService(getDatabase()).listProjectPrompts(project.id),
		shots: project.episodes.flatMap((episode) =>
			episode.scenes.flatMap((scene) =>
				scene.shots.map((shot) => ({
					id: shot.id,
					label: `${episode.title} / ${scene.title} / ${shot.title}`
				}))
			)
		)
	};
};

export const actions: Actions = {
	create: async ({ request, params }) => {
		const data = await request.formData();
		const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		try {
			await new PromptService(getDatabase()).createPrompt(
				project.id,
				text(data, 'name'),
				revisionValues(data)
			);
			return { success: true, message: 'Prompt created.' };
		} catch (cause) {
			return handle(cause);
		}
	},
	revise: async ({ request }) => {
		const data = await request.formData();
		try {
			await new PromptService(getDatabase()).createRevision(
				text(data, 'promptId'),
				revisionValues(data)
			);
			return { success: true, message: 'Immutable revision saved.' };
		} catch (cause) {
			return handle(cause);
		}
	},
	rename: async ({ request }) => {
		const data = await request.formData();
		try {
			await new PromptService(getDatabase()).renamePrompt(
				text(data, 'promptId'),
				text(data, 'name')
			);
			return { success: true, message: 'Prompt renamed.' };
		} catch (cause) {
			return handle(cause);
		}
	},
	duplicate: async ({ request }) => {
		const data = await request.formData();
		try {
			await new PromptService(getDatabase()).duplicatePrompt(text(data, 'promptId'));
			return { success: true, message: 'Prompt duplicated.' };
		} catch (cause) {
			return handle(cause);
		}
	},
	attach: async ({ request }) => {
		const data = await request.formData();
		try {
			await new PromptService(getDatabase()).attachRevisionToShot(
				text(data, 'revisionId'),
				text(data, 'shotId')
			);
			return { success: true, message: 'Exact revision attached to shot.' };
		} catch (cause) {
			return handle(cause);
		}
	}
};
