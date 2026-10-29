import { getDatabase } from '#lib/server/db/index.js';
import { StoryService } from '#lib/server/story/story-service.js';

export async function load() {
	return { projects: await new StoryService(getDatabase()).listProjects() };
}
