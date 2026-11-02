import { error } from '@sveltejs/kit';
import { getDatabase } from '#lib/server/db/index.js';
import { AssetService } from '#lib/server/media/asset-service.js';
import { getLinkedMediaService, getManagedMediaStorage } from '#lib/server/media/service.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request, url }) => {
	const asset = await new AssetService(getDatabase(), getLinkedMediaService()).getAsset(params.assetId);
	if (!asset || asset.storageType !== 'managed' || !asset.managedPath) error(404, 'Managed asset not found');
	try {
		const requestedPath = url.searchParams.get('thumbnail') === '1' && asset.thumbnailPath ? asset.thumbnailPath : asset.managedPath;
		const file = getManagedMediaStorage().open(requestedPath, request.headers.get('range'));
		const headers = new Headers({ 'Content-Type': file.mimeType, 'Content-Length': String(file.end - file.start + 1), 'Accept-Ranges': 'bytes', 'Last-Modified': file.modifiedAt, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' });
		if (file.partial) headers.set('Content-Range', `bytes ${file.start}-${file.end}/${file.size}`);
		return new Response(file.body, { status: file.partial ? 206 : 200, headers });
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Managed media unavailable';
		if (message === 'Invalid range') error(416, message);
		error(404, message);
	}
};
