<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import {
		Background,
		BackgroundVariant,
		Controls,
		MiniMap,
		SvelteFlow,
		type Connection,
		type Edge,
		type Node,
		type Viewport
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let selected = $state<Node | null>(null);
	let edgeKind = $state('references');
	let nodes = $state<Node[]>(
		untrack(() =>
			data.canvas.nodes.map((node) => ({
				id: node.id,
				position: { x: node.x, y: node.y },
				data: { label: node.label, kind: node.type, notes: node.notes, recordId: node.recordId },
				class: `forge-node forge-${node.type}`,
				parentId: node.parentId || undefined
			}))
		)
	);
	let edges = $state<Edge[]>(
		untrack(() =>
			data.canvas.edges.map((edge) => ({
				id: edge.id,
				source: edge.sourceNodeId,
				target: edge.targetNodeId,
				label: edge.type,
				type: 'smoothstep'
			}))
		)
	);
	async function send(body: Record<string, unknown>) {
		const endpoint = resolve('/api/canvas/[canvasId]', { canvasId: data.canvas.id });
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!response.ok) throw new Error((await response.json()).message);
		return response.json();
	}
	async function add(
		kind: string,
		id: string | null,
		label: string,
		position = { x: 80 + Math.random() * 300, y: 60 + Math.random() * 250 }
	) {
		const node = await send({
			action: 'add-node',
			node: { type: kind, recordId: id, label, notes: '', ...position }
		});
		nodes = [
			...nodes,
			{
				id: node.id,
				position: { x: node.x, y: node.y },
				data: { label: node.label, kind: node.type, notes: node.notes, recordId: node.recordId },
				class: `forge-node forge-${node.type}`
			}
		];
	}
	function drag(event: DragEvent, kind: string, id: string, label: string) {
		event.dataTransfer?.setData('application/frameforge', JSON.stringify({ kind, id, label }));
	}
	async function drop(event: DragEvent) {
		event.preventDefault();
		const raw = event.dataTransfer?.getData('application/frameforge');
		if (!raw) return;
		const item = JSON.parse(raw);
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		await add(item.kind, item.id, item.label, {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		});
	}
	async function connect(connection: Connection) {
		const edge = await send({
			action: 'add-edge',
			source: connection.source,
			target: connection.target,
			type: edgeKind
		});
		edges = [
			...edges,
			{
				id: edge.id,
				source: edge.sourceNodeId,
				target: edge.targetNodeId,
				label: edge.type,
				type: 'smoothstep'
			}
		];
	}
	async function remove(items: { nodes: Node[]; edges: Edge[] }) {
		await Promise.all([
			...items.nodes.map((node) => send({ action: 'delete-node', id: node.id })),
			...items.edges.map((edge) => send({ action: 'delete-edge', id: edge.id }))
		]);
	}
	function moved({ targetNode }: { targetNode: Node | null }) {
		if (targetNode)
			void send({
				action: 'move-node',
				id: targetNode.id,
				x: targetNode.position.x,
				y: targetNode.position.y
			});
	}
	function selectedNode({ node }: { node: Node }) {
		selected = node;
	}
	async function setGroup(event: Event) {
		if (!selected) return;
		const selectedId = selected.id;
		const parentId = (event.currentTarget as HTMLSelectElement).value || null;
		await send({ action: 'set-parent', id: selectedId, parentId });
		nodes = nodes.map((node) =>
			node.id === selectedId ? { ...node, parentId: parentId || undefined } : node
		);
		selected = nodes.find((node) => node.id === selectedId) || null;
	}
	async function sceneChange(event: Event) {
		const scene = (event.currentTarget as HTMLSelectElement).value;
		await goto(
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve supplies the route and this appends only a query string.
			resolve('/projects/[slug]/canvas', { slug: data.project.slug }) +
				(scene ? `?scene=${scene}` : '')
		);
	}
</script>

<svelte:head><title>Canvas · {data.project.title}</title></svelte:head>
<AppShell active="projects" inspectorTitle="Node inspector"
	><div class="canvas-page">
		<header class="canvas-toolbar">
			<a href={resolve('/projects/[slug]', { slug: data.project.slug })}>← {data.project.title}</a
			><select value={data.sceneId || ''} onchange={sceneChange}
				><option value="">Project canvas</option>{#each data.scenes as scene (scene.id)}<option
						value={scene.id}>{scene.label}</option
					>{/each}</select
			><label
				>Connection <select bind:value={edgeKind}
					>{#each ['references', 'input', 'generated-from', 'belongs-to-shot', 'continues-from', 'inspired-by'] as kind (kind)}<option
							value={kind}>{kind}</option
						>{/each}</select
				></label
			><button onclick={() => add('note', null, 'New note')}>+ Note</button><button
				onclick={() => add('group', null, 'New group')}>+ Group</button
			>
		</header>
		<div class="canvas-layout">
			<aside class="canvas-palette">
				{#each Object.entries(data.palette) as [kind, items] (kind)}<section>
						<h3>{kind}</h3>
						{#each items as item (item.id)}<button
								draggable="true"
								ondragstart={(event) => drag(event, kind.slice(0, -1), item.id, item.label)}
								onclick={() => add(kind.slice(0, -1), item.id, item.label)}
								>{item.label}<span>drag</span></button
							>{/each}
					</section>{/each}
			</aside>
			<main class="flow-wrap" ondragover={(event) => event.preventDefault()} ondrop={drop}>
				<SvelteFlow
					{nodes}
					{edges}
					fitView
					onlyRenderVisibleElements
					initialViewport={{
						x: data.canvas.viewportX,
						y: data.canvas.viewportY,
						zoom: data.canvas.viewportZoom / 1000
					}}
					onconnect={connect}
					onnodedragstop={moved}
					onnodeclick={selectedNode}
					onmoveend={(_event, viewport: Viewport) => send({ action: 'viewport', viewport })}
					ondelete={remove}
					><Background variant={BackgroundVariant.Dots} /><Controls /><MiniMap /></SvelteFlow
				>
			</main>
		</div>
	</div>
	{#snippet inspector()}{#if selected}<div class="inspector-block">
				<p class="step-label">{String(selected.data.kind)}</p>
				<h3>{String(selected.data.label)}</h3>
				<p>
					{String(
						selected.data.notes || 'Canonical records remain intact if this visual node is deleted.'
					)}
				</p>
				<label
					><span>Group</span><select value={selected.parentId || ''} onchange={setGroup}
						><option value="">Ungrouped</option
						>{#each nodes.filter((node) => node.data.kind === 'group' && node.id !== selected?.id) as group (group.id)}<option
								value={group.id}>{String(group.data.label)}</option
							>{/each}</select
					></label
				>
				<dl class="node-coordinates">
					<dt>X</dt>
					<dd>{Math.round(selected.position.x)}</dd>
					<dt>Y</dt>
					<dd>{Math.round(selected.position.y)}</dd>
				</dl>
			</div>{:else}<div class="inspector-block muted">
				<p class="step-label">Selection</p>
				<h3>Choose a node</h3>
				<p>Select a visual node to inspect its type and position.</p>
			</div>{/if}{/snippet}</AppShell
>
