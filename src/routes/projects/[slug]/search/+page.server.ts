import { error } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { SearchService } from '#lib/server/search/search-service.js';
import { StoryService } from '#lib/server/story/story-service.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, url }) => {
	const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const query = (url.searchParams.get('q') || '').trim();
	return {
		project,
		query,
		results: query ? new SearchService(getDatabase()).search(project.id, query) : []
	};
};
