import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { FrameForgeDatabase } from '../db';
import { canvasEdges, canvasNodes, canvases, scenes } from '../db/schema';

const nodeType = z.enum(['asset', 'prompt', 'shot', 'take', 'note', 'group']);
const edgeType = z.enum([
	'references',
	'input',
	'generated-from',
	'belongs-to-shot',
	'continues-from',
	'inspired-by'
]);
export class CanvasService {
	constructor(private readonly db: FrameForgeDatabase) {}
	async getOrCreate(projectId: string, sceneId?: string) {
		if (sceneId) {
			const scene = await this.db.query.scenes.findFirst({
				where: eq(scenes.id, sceneId),
				with: { episode: true }
			});
			if (!scene || scene.episode.projectId !== projectId)
				throw new Error('Scene is not in this project');
		}
		let canvas = await this.db.query.canvases.findFirst({
			where: sceneId
				? and(eq(canvases.projectId, projectId), eq(canvases.sceneId, sceneId))
				: and(eq(canvases.projectId, projectId), isNull(canvases.sceneId))
		});
		if (!canvas) {
			[canvas] = await this.db
				.insert(canvases)
				.values({
					id: crypto.randomUUID(),
					projectId,
					sceneId: sceneId || null,
					name: sceneId ? 'Scene canvas' : 'Project canvas'
				})
				.returning();
		}
		return this.get(canvas.id);
	}
	get(id: string) {
		return this.db.query.canvases.findFirst({
			where: eq(canvases.id, id),
			with: { nodes: true, edges: true }
		});
	}
	async addNode(canvasId: string, input: unknown) {
		const value = z
			.object({
				type: nodeType,
				recordId: z.string().optional().nullable(),
				label: z.string().trim().min(1).max(300),
				notes: z.string().max(20_000).default(''),
				x: z.number().finite(),
				y: z.number().finite(),
				parentId: z.string().uuid().optional().nullable()
			})
			.parse(input);
		const [node] = await this.db
			.insert(canvasNodes)
			.values({
				id: crypto.randomUUID(),
				canvasId,
				...value,
				x: Math.round(value.x),
				y: Math.round(value.y)
			})
			.returning();
		return node;
	}
	async moveNode(id: string, x: number, y: number) {
		await this.db
			.update(canvasNodes)
			.set({ x: Math.round(x), y: Math.round(y), updatedAt: new Date() })
			.where(eq(canvasNodes.id, id));
	}
	async setParent(id: string, parentId: string | null) {
		const node = await this.db.query.canvasNodes.findFirst({ where: eq(canvasNodes.id, id) });
		if (!node) throw new Error('Node not found');
		if (parentId) {
			const parent = await this.db.query.canvasNodes.findFirst({
				where: eq(canvasNodes.id, parentId)
			});
			if (
				!parent ||
				parent.canvasId !== node.canvasId ||
				parent.type !== 'group' ||
				parent.id === node.id
			)
				throw new Error('Parent must be a group on the same canvas');
		}
		await this.db
			.update(canvasNodes)
			.set({ parentId, updatedAt: new Date() })
			.where(eq(canvasNodes.id, id));
	}
	async deleteNode(id: string) {
		await this.db.delete(canvasNodes).where(eq(canvasNodes.id, id));
	}
	async addEdge(canvasId: string, sourceNodeId: string, targetNodeId: string, type: string) {
		if (sourceNodeId === targetNodeId) throw new Error('A node cannot connect to itself');
		const nodes = await Promise.all(
			[sourceNodeId, targetNodeId].map((id) =>
				this.db.query.canvasNodes.findFirst({ where: eq(canvasNodes.id, id) })
			)
		);
		if (nodes.some((node) => !node || node.canvasId !== canvasId))
			throw new Error('Connections must stay on one canvas');
		const [edge] = await this.db
			.insert(canvasEdges)
			.values({
				id: crypto.randomUUID(),
				canvasId,
				sourceNodeId,
				targetNodeId,
				type: edgeType.parse(type)
			})
			.returning();
		return edge;
	}
	async deleteEdge(id: string) {
		await this.db.delete(canvasEdges).where(eq(canvasEdges.id, id));
	}
	async setViewport(id: string, viewport: { x: number; y: number; zoom: number }) {
		await this.db
			.update(canvases)
			.set({
				viewportX: Math.round(viewport.x),
				viewportY: Math.round(viewport.y),
				viewportZoom: Math.round(viewport.zoom * 1000),
				updatedAt: new Date()
			})
			.where(eq(canvases.id, id));
	}
}
