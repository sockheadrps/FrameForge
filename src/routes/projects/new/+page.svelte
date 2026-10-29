<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
</script>

<svelte:head><title>New project · FrameForge</title></svelte:head>
<AppShell active="projects" inspectorTitle="Project setup">
	<div class="workspace form-workspace">
		<a class="back-link" href={resolve('/projects')}>← All projects</a>
		<header class="page-heading compact">
			<div>
				<p class="eyebrow">New production</p>
				<h1>Create a project</h1>
				<p>Start with the creative brief. Story structure comes next.</p>
			</div>
		</header>
		<form method="POST" class="editor-form">
			{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
			<label
				><span>Title <b>Required</b></span><input
					name="title"
					required
					maxlength="160"
					placeholder="Ghosts of the Machine"
				/></label
			>
			<label class="wide"
				><span>Logline</span><input
					name="logline"
					maxlength="500"
					placeholder="One sentence that captures the production."
				/></label
			>
			<label
				><span>Genre</span><input
					name="genre"
					maxlength="120"
					placeholder="Science-fiction anime"
				/></label
			>
			<label
				><span>Status</span><select name="status"
					><option value="concept">Concept</option><option value="pre-production"
						>Pre-production</option
					><option value="production">Production</option><option value="review">Review</option
					></select
				></label
			>
			<label class="wide"
				><span>Synopsis</span><textarea
					name="synopsis"
					rows="5"
					placeholder="What happens in this story?"></textarea></label
			>
			<label class="wide"
				><span>Visual style</span><textarea
					name="visualStyle"
					rows="4"
					placeholder="Palette, references, lighting, texture, and visual rules."></textarea></label
			>
			<div class="form-actions">
				<a class="button secondary-button" href={resolve('/projects')}>Cancel</a><button
					class="button primary">Create project</button
				>
			</div>
		</form>
	</div>
</AppShell>
