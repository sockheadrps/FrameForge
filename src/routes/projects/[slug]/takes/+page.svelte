<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	function assetHref(asset: (typeof data.assets)[number]) {
		if (asset.storageType === 'managed')
			return resolve('/media/managed/[assetId]', { assetId: asset.id });
		return asset.linkedRootId && asset.linkedRelativePath
			? resolve('/media/linked/[rootId]/[...path]', {
					rootId: asset.linkedRootId,
					path: asset.linkedRelativePath
				})
			: '';
	}
</script>

<svelte:head><title>Takes · {data.project.title}</title></svelte:head>
<AppShell active="projects" inspectorTitle="Generation lineage">
	<div class="workspace prompt-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">Review desk</p>
				<h1>Takes</h1>
				<p>
					Compare imported outputs and preserve the prompt, inputs, and settings that produced them.
				</p>
			</div>
			{#if data.shots.length && data.assets.length}<details class="menu-details">
					<summary class="button primary">Attach take</summary>
					<form method="POST" action="?/create" class="popover-form prompt-form">
						<label><span>Name</span><input name="name" required /></label><label
							><span>Shot</span><select name="shotId"
								>{#each data.shots as shot (shot.id)}<option value={shot.id}>{shot.label}</option
									>{/each}</select
							></label
						><label
							><span>Output media</span><select name="outputAssetId"
								>{#each data.assets as asset (asset.id)}<option value={asset.id}
										>{asset.originalName}</option
									>{/each}</select
							></label
						><label
							><span>Exact prompt revision</span><select name="promptRevisionId"
								><option value="">Undocumented</option
								>{#each data.prompts as prompt (prompt.id)}{#each prompt.revisions as revision (revision.id)}<option
											value={revision.id}>{prompt.name} · r{revision.revisionNumber}</option
										>{/each}{/each}</select
							></label
						>
						<div class="form-grid">
							{#each [['startFrameId', 'Start frame'], ['endFrameId', 'End frame'], ['referenceId', 'Reference']] as field (field[0])}<label
									><span>{field[1]}</span><select name={field[0]}
										><option value="">None</option>{#each data.assets as asset (asset.id)}<option
												value={asset.id}>{asset.originalName}</option
											>{/each}</select
									></label
								>{/each}
						</div>
						<div class="form-grid">
							{#each [['model', 'Model'], ['seed', 'Seed'], ['resolution', 'Resolution'], ['workflow', 'Workflow']] as field (field[0])}<label
									><span>{field[1]}</span><input name={field[0]} /></label
								>{/each}
						</div>
						<label><span>Review notes</span><textarea name="reviewNotes"></textarea></label><button
							class="button primary">Save take</button
						>
					</form>
				</details>{/if}
		</header>
		<nav class="mode-tabs">
			<a href={resolve('/projects/[slug]', { slug: data.project.slug })}>Story</a><a
				href={resolve('/projects/[slug]/canvas', { slug: data.project.slug })}>Canvas</a
			><a href={resolve('/projects/[slug]/storyboard', { slug: data.project.slug })}>Storyboard</a
			><a class="active" href={resolve('/projects/[slug]/takes', { slug: data.project.slug })}
				>Review</a
			><a href={resolve('/projects/[slug]/prompts', { slug: data.project.slug })}>Prompts</a>
		</nav>
		{#if form?.message}<p class:success-message={form.success} class="form-error">
				{form.message}
			</p>{/if}
		{#if data.shots.some((shot) => shot.takes.length)}<div class="take-scenes">
				{#each data.shots.filter((shot) => shot.takes.length) as shot (shot.id)}<section
						class="prompt-card"
					>
						<header>
							<div>
								<p class="eyebrow">
									{shot.takes.length} candidate{shot.takes.length === 1 ? '' : 's'}
								</p>
								<h2>{shot.label}</h2>
							</div>
						</header>
						<div class="take-grid">
							{#each shot.takes as take (take.id)}<article
									class:approved={take.isPrimary}
									class="take-card"
								>
									<div class="take-media">
										{#if take.outputAsset.mediaType === 'video'}<!-- svelte-ignore a11y_media_has_caption --><video
												src={assetHref(take.outputAsset)}
												controls
												preload="metadata"
											></video>{:else}<img
												src={assetHref(take.outputAsset)}
												alt={take.outputAsset.originalName}
											/>{/if}
									</div>
									<header>
										<div>
											<strong>{take.name}</strong><span class="status-pill"
												>{take.status}{take.isPrimary ? ' · primary' : ''}</span
											>
										</div>
										<small>{take.outputAsset.originalName}</small>
									</header>
									<dl>
										<div>
											<dt>Prompt</dt>
											<dd>
												{take.promptRevision
													? `r${take.promptRevision.revisionNumber}: ${take.promptRevision.text}`
													: 'Undocumented'}
											</dd>
										</div>
										<div>
											<dt>Settings</dt>
											<dd>
												{[take.model, take.seed, take.resolution, take.workflow]
													.filter(Boolean)
													.join(' · ') || '—'}
											</dd>
										</div>
										<div>
											<dt>Inputs</dt>
											<dd>
												{take.inputs
													.map(
														(input) =>
															`${input.role}: ${input.asset.originalName}${input.worldReferenceVersion ? ` (${input.worldReferenceVersion.entity.name} v${input.worldReferenceVersion.versionNumber}${(input.worldReferenceVersion.entity.references[0]?.versionNumber ?? 0) > input.worldReferenceVersion.versionNumber ? ', newer reference available' : ''})` : ''}`
													)
													.join(' · ') || 'None documented'}
											</dd>
										</div>
									</dl>
									<form method="POST" action="?/review" class="review-form">
										<input type="hidden" name="takeId" value={take.id} /><textarea
											name="reviewNotes"
											placeholder="Review notes">{take.reviewNotes}</textarea
										>
										<div>
											<button name="status" value="candidate">Candidate</button><button
												name="status"
												value="rejected">Reject</button
											><button class="button primary" name="status" value="approved">Approve</button
											>
										</div>
									</form>
								</article>{/each}
						</div>
					</section>{/each}
			</div>{:else}<EmptyState
				title="No takes attached"
				description={data.assets.length
					? 'Attach imported media to a shot to begin review.'
					: 'Import media into this project, then attach it as a take.'}
			/>{/if}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Approval rule</p>
			<h3>One primary per shot</h3>
			<p>Approving a take safely returns the prior approval to candidate status.</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">Lineage</p>
			<h3>Exact inputs</h3>
			<p>
				Each take records its output, immutable prompt revision, ordered references, and generation
				notes.
			</p>
		</div>{/snippet}
</AppShell>
