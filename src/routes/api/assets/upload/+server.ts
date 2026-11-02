import { json } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { AssetService } from '#lib/server/media/asset-service.js';
import { getLinkedMediaService, getManagedMediaStorage } from '#lib/server/media/service.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const projectId = url.searchParams.get('projectId') ?? '';
	const encodedName = request.headers.get('x-frameforge-filename') ?? 'upload';
	let name: string;
	try {
		name = decodeURIComponent(encodedName);
	} catch {
		return json({ message: 'Invalid upload filename.' }, { status: 400 });
	}
	const storage = getManagedMediaStorage();
	try {
		const staged = await storage.stage(request.body, name);
		const result = await new AssetService(getDatabase(), getLinkedMediaService()).importManaged(
			projectId,
			staged,
			storage
		);
		return json(
			{
				asset: result.asset,
				created: result.created,
				message: result.created
					? `Uploaded ${result.asset.originalName}.`
					: `${result.asset.originalName} already exists in that project.`
			},
			{ status: result.created ? 201 : 200 }
		);
	} catch (cause) {
		return json(
			{ message: cause instanceof Error ? cause.message : 'Upload failed.' },
			{ status: 400 }
		);
	}
};
