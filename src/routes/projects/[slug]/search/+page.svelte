<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Search · {data.project.title}</title></svelte:head><AppShell
	active="projects"
	inspectorTitle="Search"
	><div class="workspace prompt-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">Project-wide</p>
				<h1>Search</h1>
			</div>
			<form method="GET" class="search-form">
				<input
					name="q"
					value={data.query}
					placeholder="Shots, prompts, media, continuity…"
				/><button class="button primary">Search</button>
			</form>
		</header>
		{#if data.query}<p class="eyebrow">{data.results.length} results</p>
			<div class="search-results">
				{#each data.results as result (`${result.type}-${result.id}`)}<article>
						<span>{result.type}</span>
						<div>
							<h2>{result.title}</h2>
							<p>{result.detail || 'No additional detail.'}</p>
						</div>
					</article>{/each}
			</div>{/if}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Scope</p>
			<h3>One project</h3>
			<p>Search covers story records, prompts, assets, takes, and world-continuity entities.</p>
		</div>{/snippet}</AppShell
>
