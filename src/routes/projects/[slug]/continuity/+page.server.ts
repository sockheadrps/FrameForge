import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { ContinuityService } from '#lib/server/continuity/continuity-service.js';
import { getDatabase } from '#lib/server/db/index.js';
import { assets } from '#lib/server/db/schema.js';
import { StoryService } from '#lib/server/story/story-service.js';
import type { Actions, PageServerLoad } from './$types';
const value = (data: FormData, key: string) => String(data.get(key) ?? '');
const failure = (cause: unknown) =>
	fail(400, { message: cause instanceof Error ? cause.message : 'Continuity action failed.' });
export const load: PageServerLoad = async ({ params }) => {
	const db = getDatabase();
	const project = await new StoryService(db).getProjectBySlug(params.slug);
	if (!project) error(404, 'Project not found');
	const scenes = project.episodes.flatMap((episode) =>
		episode.scenes.map((scene) => ({
			id: scene.id,
			episodeId: episode.id,
			label: `${episode.title} / ${scene.title}`,
			shots: scene.shots.map((shot) => ({ id: shot.id, label: `${scene.title} / ${shot.title}` }))
		}))
	);
	return {
		project,
		entities: await new ContinuityService(db).list(project.id),
		assets: await db.select().from(assets).where(eq(assets.projectId, project.id)),
		scenes,
		episodes: project.episodes.map(({ id, title }) => ({ id, title }))
	};
};
export const actions: Actions = {
	create: async ({ request, params }) => {
		const data = await request.formData();
		const project = await new StoryService(getDatabase()).getProjectBySlug(params.slug);
		if (!project) error(404, 'Project not found');
		try {
			await new ContinuityService(getDatabase()).create(
				project.id,
				value(data, 'type'),
				value(data, 'name'),
				value(data, 'description')
			);
			return { success: true, message: 'Continuity entity created.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	reference: async ({ request }) => {
		const data = await request.formData();
		try {
			await new ContinuityService(getDatabase()).addReference(
				value(data, 'entityId'),
				value(data, 'assetId'),
				value(data, 'notes')
			);
			return { success: true, message: 'Reference version added.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	canonical: async ({ request }) => {
		const data = await request.formData();
		try {
			await new ContinuityService(getDatabase()).setCanonical(
				value(data, 'entityId'),
				value(data, 'referenceId')
			);
			return { success: true, message: 'Canonical reference updated.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	link: async ({ request }) => {
		const data = await request.formData();
		try {
			const service = new ContinuityService(getDatabase());
			const sceneId = value(data, 'sceneId');
			const shotId = value(data, 'shotId');
			if (sceneId) await service.linkScene(value(data, 'entityId'), sceneId);
			if (shotId) await service.linkShot(value(data, 'entityId'), shotId);
			return { success: true, message: 'Continuity link saved.' };
		} catch (cause) {
			return failure(cause);
		}
	},
	arc: async ({ request }) => {
		const data = await request.formData();
		try {
			await new ContinuityService(getDatabase()).addArcNote(
				value(data, 'entityId'),
				value(data, 'note'),
				data.get('turningPoint') === 'on',
				value(data, 'episodeId') || undefined,
				value(data, 'sceneId') || undefined
			);
			return { success: true, message: 'Character arc note saved.' };
		} catch (cause) {
			return failure(cause);
		}
	}
};
