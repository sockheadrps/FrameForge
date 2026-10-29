import { getDatabase } from '#lib/server/db/index.js';
import { StoryService } from '#lib/server/story/story-service.js';

export async function load() {
	const projects = await new StoryService(getDatabase()).listProjects();
	return { recentProjects: projects.slice(0, 2) };
}
