<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Projects · FrameForge</title></svelte:head>
<AppShell active="projects" inspectorTitle="Project library">
	<div class="workspace">
		<header class="page-heading">
			<div>
				<p class="eyebrow">Productions</p>
				<h1>Projects</h1>
				<p>Every story, from first idea to approved sequence.</p>
			</div>
			<a class="button primary" href={resolve('/projects/new')}
				>New project <span aria-hidden="true">＋</span></a
			>
		</header>
		{#if data.projects.length}
			<div class="project-list">
				{#each data.projects as project (project.id)}
					<a class="project-row" href={resolve('/projects/[slug]', { slug: project.slug })}>
						<span class="project-row-mark">FF</span><span
							><strong>{project.title}</strong><small>{project.logline || 'No logline yet'}</small
							></span
						>
						<span class="status-pill static">{project.status}</span><span aria-hidden="true">→</span
						>
					</a>
				{/each}
			</div>
		{:else}
			<EmptyState
				title="No projects yet"
				description="Create your first production and begin shaping the story."
			/>
		{/if}
	</div>
</AppShell>
