import { fail } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import { getDatabase } from '#lib/server/db/index.js';
import { AssetService } from '#lib/server/media/asset-service.js';
import { assets as assetTable } from '#lib/server/db/schema.js';
import { getLinkedMediaService, getManagedMediaStorage } from '#lib/server/media/service.js';
import { StoryService } from '#lib/server/story/story-service.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const service = getLinkedMediaService();
	const roots = service.listRoots();
	const projects = await new StoryService(getDatabase()).listProjects();
	const selectedProjectId = url.searchParams.get('project') || projects[0]?.id || null;
	const assetPage = Math.max(1, Number(url.searchParams.get('assetPage') || 1) || 1);
	const assetPageSize = 60;
	const assets = selectedProjectId
		? await new AssetService(getDatabase(), service, getManagedMediaStorage()).listProjectAssets(
				selectedProjectId,
				{ limit: assetPageSize, offset: (assetPage - 1) * assetPageSize }
			)
		: [];
	const assetCount = selectedProjectId
		? ((
				await getDatabase()
					.select({ value: count() })
					.from(assetTable)
					.where(eq(assetTable.projectId, selectedProjectId))
			)[0]?.value ?? 0)
		: 0;
	const assetPageCount = Math.max(1, Math.ceil(assetCount / assetPageSize));
	const projectTree = selectedProjectId
		? await new StoryService(getDatabase())
				.getProject(selectedProjectId)
				.then((project) =>
					project ? new StoryService(getDatabase()).getProjectBySlug(project.slug) : undefined
				)
		: undefined;
	const tags = selectedProjectId
		? await new AssetService(getDatabase(), service).listProjectTags(selectedProjectId)
		: [];
	const shotOptions =
		projectTree?.episodes.flatMap((episode) =>
			episode.scenes.flatMap((scene) =>
				scene.shots.map((shot) => ({
					id: shot.id,
					label: `${episode.title} / ${scene.title} / ${shot.title}`
				}))
			)
		) ?? [];
	const rootId =
		url.searchParams.get('root') || roots.find((root) => root.available)?.id || roots[0]?.id;
	const requestedPath = url.searchParams.get('path') || '';
	if (!rootId)
		return {
			roots,
			projects,
			assets,
			assetPage,
			assetPageCount,
			tags,
			shotOptions,
			selectedProjectId,
			rootId: null,
			path: '',
			entries: [],
			message: 'No linked-media roots are configured.'
		};
	try {
		const listing = service.list(rootId, requestedPath);
		return {
			roots,
			projects,
			assets,
			assetPage,
			assetPageCount,
			tags,
			shotOptions,
			selectedProjectId,
			rootId,
			...listing,
			message: null
		};
	} catch (cause) {
		return {
			roots,
			projects,
			assets,
			assetPage,
			assetPageCount,
			tags,
			shotOptions,
			selectedProjectId,
			rootId,
			path: requestedPath,
			entries: [],
			message: cause instanceof Error ? cause.message : 'Media source unavailable.'
		};
	}
};

export const actions: Actions = {
	linkAsset: async ({ request }) => {
		const data = await request.formData();
		try {
			const result = await new AssetService(
				getDatabase(),
				getLinkedMediaService()
			).linkFromConfiguredRoot({
				projectId: String(data.get('projectId') ?? ''),
				rootId: String(data.get('rootId') ?? ''),
				relativePath: String(data.get('relativePath') ?? '')
			});
			return {
				success: true,
				message: result.created
					? `Added ${result.asset.originalName} to the project.`
					: `${result.asset.originalName} is already in that project.`
			};
		} catch (cause) {
			if (cause instanceof ZodError)
				return fail(400, { message: cause.issues[0]?.message ?? 'Invalid asset selection.' });
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not add the asset.'
			});
		}
	},
	updateAsset: async ({ request }) => {
		const data = await request.formData();
		try {
			await new AssetService(getDatabase(), getLinkedMediaService()).updateAsset(
				String(data.get('id') ?? ''),
				{
					category: String(data.get('category') ?? 'general'),
					notes: String(data.get('notes') ?? '')
				}
			);
			return { success: true, message: 'Asset details saved.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not update asset.'
			});
		}
	},
	createTag: async ({ request }) => {
		const data = await request.formData();
		try {
			await new AssetService(getDatabase(), getLinkedMediaService()).createTag(
				String(data.get('projectId') ?? ''),
				String(data.get('name') ?? '')
			);
			return { success: true, message: 'Tag created.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not create tag.'
			});
		}
	},
	assignTag: async ({ request }) => {
		const data = await request.formData();
		try {
			await new AssetService(getDatabase(), getLinkedMediaService()).assignTag(
				String(data.get('assetId') ?? ''),
				String(data.get('tagId') ?? '')
			);
			return { success: true, message: 'Tag assigned.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not assign tag.'
			});
		}
	},
	linkShot: async ({ request }) => {
		const data = await request.formData();
		try {
			await new AssetService(getDatabase(), getLinkedMediaService()).linkToShot(
				String(data.get('assetId') ?? ''),
				String(data.get('shotId') ?? ''),
				String(data.get('role') ?? 'reference')
			);
			return { success: true, message: 'Asset linked to shot.' };
		} catch (cause) {
			return fail(400, {
				message: cause instanceof Error ? cause.message : 'Could not link asset.'
			});
		}
	}
};
