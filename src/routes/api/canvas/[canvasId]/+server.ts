import { json } from '@sveltejs/kit';
import { CanvasService } from '#lib/server/canvas/canvas-service.js';
import { getDatabase } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const service = new CanvasService(getDatabase());
	try {
		if (body.action === 'add-node') return json(await service.addNode(params.canvasId, body.node));
		if (body.action === 'move-node') {
			await service.moveNode(body.id, body.x, body.y);
			return json({ ok: true });
		}
		if (body.action === 'set-parent') {
			await service.setParent(body.id, body.parentId || null);
			return json({ ok: true });
		}
		if (body.action === 'delete-node') {
			await service.deleteNode(body.id);
			return json({ ok: true });
		}
		if (body.action === 'add-edge')
			return json(await service.addEdge(params.canvasId, body.source, body.target, body.type));
		if (body.action === 'delete-edge') {
			await service.deleteEdge(body.id);
			return json({ ok: true });
		}
		if (body.action === 'viewport') {
			await service.setViewport(params.canvasId, body.viewport);
			return json({ ok: true });
		}
		return json({ message: 'Unknown canvas action' }, { status: 400 });
	} catch (cause) {
		return json(
			{ message: cause instanceof Error ? cause.message : 'Canvas action failed' },
			{ status: 400 }
		);
	}
};
