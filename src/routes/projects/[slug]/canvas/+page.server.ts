import { error } from '@sveltejs/kit';
import { CanvasService } from '#lib/server/canvas/canvas-service.js';
import { getDatabase } from '#lib/server/db/index.js';
import { PromptService } from '#lib/server/prompts/prompt-service.js';
import { StoryService } from '#lib/server/story/story-service.js';
import { TakeService } from '#lib/server/takes/take-service.js';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params, url }) => {
	const db = getDatabase();
	const project = await new StoryService(db).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const sceneId = url.searchParams.get('scene') || undefined;
	const canvas = await new CanvasService(db).getOrCreate(project.id, sceneId);
	if (!canvas) error(500, 'Canvas unavailable');
	const assets = await db.query.assets.findMany({
		where: (table, { eq }) => eq(table.projectId, project.id)
	});
	const prompts = await new PromptService(db).listProjectPrompts(project.id);
	const shots = project.episodes.flatMap((episode) =>
		episode.scenes.flatMap((scene) =>
			scene.shots.map((shot) => ({
				...shot,
				sceneId: scene.id,
				label: `${scene.title} / ${shot.title}`
			}))
		)
	);
	const takes = (
		await Promise.all(shots.map((shot) => new TakeService(db).listShotTakes(shot.id)))
	).flat();
	const scenes = project.episodes.flatMap((episode) =>
		episode.scenes.map((scene) => ({ id: scene.id, label: `${episode.title} / ${scene.title}` }))
	);
	return {
		project,
		canvas,
		scenes,
		sceneId: sceneId || null,
		palette: {
			assets: assets.map((item) => ({ id: item.id, label: item.originalName })),
			prompts: prompts.map((item) => ({ id: item.id, label: item.name })),
			shots: shots.map((item) => ({ id: item.id, label: item.label })),
			takes: takes.map((item) => ({ id: item.id, label: item.name }))
		}
	};
};
