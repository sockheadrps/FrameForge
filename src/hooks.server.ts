import { log } from '#lib/server/logger.js';
import type { HandleServerError } from '@sveltejs/kit/hooks';
export const handleError: HandleServerError = ({ error, event, kind }) => {
	log('error', 'request_error', {
		method: event.request.method,
		path: event.url.pathname,
		kind,
		error: error instanceof Error ? error.message : String(error)
	});
	return { message: 'FrameForge encountered an unexpected local error.' };
};
