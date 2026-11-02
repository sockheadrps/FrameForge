<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let importMessage = $state('');
	async function importProject(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		importMessage = 'Importing…';
		const response = await fetch(resolve('/api/projects/[slug]/package', { slug: 'import' }), {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: await file.text()
		});
		const result = await response.json();
		if (!response.ok) {
			importMessage = result.message || 'Import failed.';
			return;
		}
		await invalidateAll();
		await goto(resolve('/projects/[slug]', { slug: result.slug }));
	}
</script>

<svelte:head><title>Projects · FrameForge</title></svelte:head><AppShell
	active="projects"
	inspectorTitle="Project library"
	><div class="workspace">
		<header class="page-heading">
			<div>
				<p class="eyebrow">Productions</p>
				<h1>Projects</h1>
				<p>Every story, from first idea to approved sequence.</p>
			</div>
			<div class="heading-actions">
				<label class="button secondary-button"
					>Import package<input
						class="visually-hidden"
						type="file"
						accept=".json,application/json"
						onchange={importProject}
					/></label
				><a class="button primary" href={resolve('/projects/new')}
					>New project <span aria-hidden="true">+</span></a
				>
			</div>
		</header>
		{#if importMessage}<p class="form-error" role="status">
				{importMessage}
			</p>{/if}{#if data.projects.length}<div class="project-list">
				{#each data.projects as project (project.id)}<a
						class="project-row"
						href={resolve('/projects/[slug]', { slug: project.slug })}
						><span class="project-row-mark">FF</span><span
							><strong>{project.title}</strong><small>{project.logline || 'No logline yet'}</small
							></span
						><span class="status-pill static">{project.status}</span><span aria-hidden="true"
							>→</span
						></a
					>{/each}
			</div>{:else}<EmptyState
				title="No projects yet"
				description="Create your first production and begin shaping the story."
			/>{/if}
	</div></AppShell
>
