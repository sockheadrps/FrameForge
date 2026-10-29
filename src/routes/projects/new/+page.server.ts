import { fail, redirect } from '@sveltejs/kit';
import { ZodError } from 'zod';
import { getDatabase } from '#lib/server/db/index.js';
import { StoryService } from '#lib/server/story/story-service.js';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		try {
			const project = await new StoryService(getDatabase()).createProject({
				title: String(data.get('title') ?? ''),
				logline: String(data.get('logline') ?? ''),
				synopsis: String(data.get('synopsis') ?? ''),
				genre: String(data.get('genre') ?? ''),
				visualStyle: String(data.get('visualStyle') ?? ''),
				status: String(data.get('status') ?? 'concept') as 'concept'
			});
			redirect(303, `/projects/${project.slug}`);
		} catch (error) {
			if (error instanceof ZodError)
				return fail(400, { message: error.issues[0]?.message ?? 'Check the project details.' });
			throw error;
		}
	}
};
