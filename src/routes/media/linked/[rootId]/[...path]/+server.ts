import { error } from '@sveltejs/kit';
import { getLinkedMediaService } from '#lib/server/media/service.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params, request }) => {
	try {
		const file = getLinkedMediaService().open(params.rootId, params.path, request.headers.get('range'));
		const headers = new Headers({
			'Content-Type': file.mimeType,
			'Content-Length': String(file.end - file.start + 1),
			'Accept-Ranges': 'bytes',
			'Last-Modified': file.modifiedAt,
			'Cache-Control': 'private, max-age=3600',
			'X-Content-Type-Options': 'nosniff'
		});
		if (file.partial) headers.set('Content-Range', `bytes ${file.start}-${file.end}/${file.size}`);
		return new Response(file.body, { status: file.partial ? 206 : 200, headers });
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : 'Linked media unavailable';
		if (message === 'Invalid range') error(416, message);
		error(404, message);
	}
};
