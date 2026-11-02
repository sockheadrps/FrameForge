<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
	}
</script>

<svelte:head><title>Prompts · {data.project.title}</title></svelte:head>
<AppShell active="projects" inspectorTitle="Prompt lineage">
	<div class="workspace prompt-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">Reusable writing</p>
				<h1>Prompts</h1>
				<p>
					Every saved revision is immutable so generated takes can always point to the exact text
					used.
				</p>
			</div>
			<details class="menu-details">
				<summary class="button primary">New prompt</summary>
				<form method="POST" action="?/create" class="popover-form prompt-form">
					<label><span>Name</span><input name="name" required /></label><label
						><span>Prompt</span><textarea name="text" rows="8" required></textarea></label
					><label
						><span>Negative prompt</span><textarea name="negativePrompt" rows="3"></textarea></label
					><label><span>Model / workflow</span><input name="modelWorkflow" /></label><label
						><span>Purpose</span><input name="purpose" /></label
					><label><span>Notes</span><textarea name="notes"></textarea></label><button
						class="button primary">Save prompt</button
					>
				</form>
			</details>
		</header>
		<nav class="mode-tabs">
			<a href={resolve('/projects/[slug]', { slug: data.project.slug })}>Story</a><a
				href={resolve('/projects/[slug]/canvas', { slug: data.project.slug })}>Canvas</a
			><a href={resolve('/projects/[slug]/storyboard', { slug: data.project.slug })}>Storyboard</a
			><a href={resolve('/projects/[slug]/takes', { slug: data.project.slug })}>Review</a><a
				class="active"
				href={resolve('/projects/[slug]/prompts', { slug: data.project.slug })}>Prompts</a
			>
		</nav>
		{#if form?.message}<p class:success-message={form.success} class="form-error" role="status">
				{form.message}
			</p>{/if}
		{#if data.prompts.length}<div class="prompt-list">
				{#each data.prompts as prompt (prompt.id)}<article class="prompt-card">
						<header>
							<div>
								<p class="eyebrow">
									{prompt.revisions.length} revision{prompt.revisions.length === 1 ? '' : 's'}
								</p>
								<h2>{prompt.name}</h2>
							</div>
							<div class="prompt-actions">
								<form method="POST" action="?/duplicate">
									<input type="hidden" name="promptId" value={prompt.id} /><button>Duplicate</button
									>
								</form>
								<details>
									<summary>Rename</summary>
									<form method="POST" action="?/rename" class="popover-form">
										<input type="hidden" name="promptId" value={prompt.id} /><label
											><span>Name</span><input name="name" value={prompt.name} required /></label
										><button class="button primary">Rename</button>
									</form>
								</details>
							</div>
						</header>
						<div class="revision-grid">
							{#each prompt.revisions as revision, index (revision.id)}<section
									class="revision-card"
								>
									<header>
										<strong>Revision {revision.revisionNumber}</strong><span
											>{new Date(revision.createdAt).toLocaleDateString()}</span
										>
									</header>
									<p>{revision.text}</p>
									{#if revision.negativePrompt}<small
											><b>Negative:</b> {revision.negativePrompt}</small
										>{/if}
									<dl>
										<div>
											<dt>Workflow</dt>
											<dd>{revision.modelWorkflow || '—'}</dd>
										</div>
										<div>
											<dt>Purpose</dt>
											<dd>{revision.purpose || '—'}</dd>
										</div>
									</dl>
									<div class="revision-actions">
										<button onclick={() => copy(revision.text)}>Copy</button
										>{#if data.shots.length}<details>
												<summary>Attach to shot</summary>
												<form method="POST" action="?/attach" class="popover-form">
													<input type="hidden" name="revisionId" value={revision.id} /><select
														name="shotId"
														>{#each data.shots as shot (shot.id)}<option value={shot.id}
																>{shot.label}</option
															>{/each}</select
													><button class="button primary">Attach revision</button>
												</form>
											</details>{/if}{#if index === 0}<details>
												<summary>New revision</summary>
												<form method="POST" action="?/revise" class="popover-form prompt-form">
													<input type="hidden" name="promptId" value={prompt.id} /><label
														><span>Prompt</span><textarea name="text" rows="8" required
															>{revision.text}</textarea
														></label
													><label
														><span>Negative</span><textarea name="negativePrompt"
															>{revision.negativePrompt}</textarea
														></label
													><label
														><span>Model / workflow</span><input
															name="modelWorkflow"
															value={revision.modelWorkflow}
														/></label
													><label
														><span>Purpose</span><input
															name="purpose"
															value={revision.purpose}
														/></label
													><label
														><span>Notes</span><textarea name="notes">{revision.notes}</textarea
														></label
													><button class="button primary">Save revision</button>
												</form>
											</details>{/if}
									</div>
								</section>{/each}
						</div>
					</article>{/each}
			</div>{:else}<EmptyState
				title="No prompts yet"
				description="Create a prompt and preserve its first immutable revision."
			/>{/if}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Immutable history</p>
			<h3>Revisions never change</h3>
			<p>Editing creates a new revision; old text stays available for generation lineage.</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">External generation</p>
			<h3>No ComfyUI coupling</h3>
			<p>Workflow labels are notes only. Copy prompt text into any generation tool.</p>
		</div>{/snippet}
</AppShell>
