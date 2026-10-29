<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Dashboard · FrameForge</title></svelte:head>

<AppShell active="dashboard" inspectorTitle="Getting started">
	<div class="workspace dashboard">
		<header class="page-heading">
			<div>
				<p class="eyebrow">Production desk</p>
				<h1>Good evening.</h1>
				<p>Pick up a production or start shaping something new.</p>
			</div>
			<a class="button primary" href={resolve('/projects/new')}
				>New project <span aria-hidden="true">＋</span></a
			>
		</header>
		<section aria-labelledby="recent-heading">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Continue working</p>
					<h2 id="recent-heading">Recent projects</h2>
				</div>
				<a class="text-link" href={resolve('/projects')}
					>View all <span aria-hidden="true">→</span></a
				>
			</div>
			<div class="project-grid">
				{#each data.recentProjects as project, index (project.id)}
					<a class="project-card" href={resolve('/projects/[slug]', { slug: project.slug })}>
						<div class:coral={index % 2 === 1} class="project-art">
							<span class="project-mark">FF</span><span class="status-pill">{project.status}</span>
						</div>
						<div class="project-copy">
							<h3>{project.title}</h3>
							<p>{project.genre || 'FrameForge production'}</p>
						</div>
					</a>
				{/each}
				<a class="new-project-card" href={resolve('/projects/new')}
					><span class="plus" aria-hidden="true">＋</span><strong>Create a project</strong><span
						>Build a new story from the first shot.</span
					></a
				>
			</div>
		</section>
		<section class="activity" aria-labelledby="activity-heading">
			<div class="section-heading">
				<div>
					<p class="eyebrow">At a glance</p>
					<h2 id="activity-heading">Production activity</h2>
				</div>
			</div>
			<EmptyState
				icon="timeline"
				title="Your production history starts here"
				description="Edits, imports, and approvals will appear as you work."
			/>
		</section>
	</div>
	{#snippet inspector()}
		<div class="inspector-block">
			<p class="step-label">01 · Create</p>
			<h3>Set the stage</h3>
			<p>Give your production a title, logline, and visual direction.</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">02 · Organize</p>
			<h3>Shape the story</h3>
			<p>Break it into episodes, scenes, and individual shots.</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">03 · Forge</p>
			<h3>Connect the work</h3>
			<p>Keep every reference, prompt revision, and take traceable.</p>
		</div>
	{/snippet}
</AppShell>
