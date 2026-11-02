<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { Asset } from '#lib/server/db/schema.js';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let status = $state('all');
	let assets = $state('all');
	function approved(
		shot: (typeof data.project.episodes)[number]['scenes'][number]['shots'][number]
	) {
		return shot.takes.find((take) => take.isPrimary);
	}
	function href(asset: Asset) {
		return asset.storageType === 'managed'
			? resolve('/media/managed/[assetId]', { assetId: asset.id })
			: asset.linkedRootId && asset.linkedRelativePath
				? resolve('/media/linked/[rootId]/[...path]', {
						rootId: asset.linkedRootId,
						path: asset.linkedRelativePath
					})
				: '';
	}
	function ordered(shots: { id: string }[], index: number, offset: number) {
		const ids = shots.map((shot) => shot.id);
		const target = index + offset;
		if (target < 0 || target >= ids.length) return JSON.stringify(ids);
		[ids[index], ids[target]] = [ids[target], ids[index]];
		return JSON.stringify(ids);
	}
	function visible(
		shot: (typeof data.project.episodes)[number]['scenes'][number]['shots'][number]
	) {
		return (
			(status === 'all' || shot.status === status) &&
			(assets === 'all' || (assets === 'missing' ? !approved(shot) : !!approved(shot)))
		);
	}
	function duration(scene: (typeof data.project.episodes)[number]['scenes'][number]) {
		return scene.shots.reduce(
			(sum, shot) => sum + (approved(shot)?.outputAsset.durationMs || shot.targetDurationMs),
			0
		);
	}
</script>

<svelte:head><title>Storyboard · {data.project.title}</title></svelte:head>
<AppShell active="projects" inspectorTitle="Storyboard inspector"
	><div class="workspace prompt-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">Visual sequence</p>
				<h1>Storyboard</h1>
				<p>Canonical shot order with approved media, timing, and production status.</p>
			</div>
			<div class="storyboard-filters">
				<select bind:value={status}
					><option value="all">All statuses</option
					>{#each ['planned', 'ready', 'generating', 'review', 'approved', 'blocked'] as item (item)}<option
							value={item}>{item}</option
						>{/each}</select
				><select bind:value={assets}
					><option value="all">All assets</option><option value="approved">Has approval</option
					><option value="missing">Missing approval</option></select
				>
			</div>
		</header>
		<nav class="mode-tabs">
			<a href={resolve('/projects/[slug]', { slug: data.project.slug })}>Story</a><a
				href={resolve('/projects/[slug]/canvas', { slug: data.project.slug })}>Canvas</a
			><a class="active" href={resolve('/projects/[slug]/storyboard', { slug: data.project.slug })}
				>Storyboard</a
			><a href={resolve('/projects/[slug]/takes', { slug: data.project.slug })}>Review</a><a
				href={resolve('/projects/[slug]/prompts', { slug: data.project.slug })}>Prompts</a
			>
		</nav>
		{#if form?.message}<p class:success-message={form.success} class="form-error">
				{form.message}
			</p>{/if}{#each data.project.episodes as episode (episode.id)}<section
				class="storyboard-episode"
			>
				<p class="eyebrow">{episode.title}</p>
				{#each episode.scenes as scene (scene.id)}<div class="storyboard-scene">
						<header>
							<h2>{scene.title}</h2>
							<span>{(duration(scene) / 1000).toFixed(1)}s estimated runtime</span>
						</header>
						<div class="storyboard-row">
							{#each scene.shots as shot, index (shot.id)}{#if visible(shot)}<article
										class="storyboard-card"
									>
										<div class:placeholder={!approved(shot)} class="storyboard-thumb">
											{#if approved(shot)}{@const take =
													approved(shot)!}{#if take.outputAsset.mediaType === 'video'}<video
														src={href(take.outputAsset)}
														muted
														preload="metadata"
													></video>{:else}<img
														src={href(take.outputAsset)}
														alt={take.outputAsset.originalName}
													/>{/if}{:else}<span>No approved media</span>{/if}<b>{index + 1}</b>
										</div>
										<header>
											<strong>{shot.title}</strong><span
												>{(
													(approved(shot)?.outputAsset.durationMs || shot.targetDurationMs) / 1000
												).toFixed(1)}s · {shot.status}</span
											>
										</header>
										<p>{shot.actionDescription || 'No action description.'}</p>
										<div class="card-controls">
											<form method="POST" action="?/reorder">
												<input type="hidden" name="sceneId" value={scene.id} /><input
													type="hidden"
													name="orderedIds"
													value={ordered(scene.shots, index, -1)}
												/><button disabled={index === 0}>←</button>
											</form>
											<form method="POST" action="?/reorder">
												<input type="hidden" name="sceneId" value={scene.id} /><input
													type="hidden"
													name="orderedIds"
													value={ordered(scene.shots, index, 1)}
												/><button disabled={index === scene.shots.length - 1}>→</button>
											</form>
											<details>
												<summary>Inspect</summary>
												<form method="POST" action="?/update" class="popover-form prompt-form">
													<input type="hidden" name="id" value={shot.id} /><label
														><span>Title</span><input name="title" value={shot.title} /></label
													><label
														><span>Action</span><textarea name="actionDescription"
															>{shot.actionDescription}</textarea
														></label
													>
													<div class="form-grid">
														<label
															><span>Framing</span><input
																name="cameraFraming"
																value={shot.cameraFraming}
															/></label
														><label
															><span>Movement</span><input
																name="cameraMovement"
																value={shot.cameraMovement}
															/></label
														><label
															><span>Target ms</span><input
																name="targetDurationMs"
																type="number"
																value={shot.targetDurationMs}
															/></label
														><label
															><span>Status</span><select name="status" value={shot.status}
																>{#each ['planned', 'ready', 'generating', 'review', 'approved', 'blocked'] as item (item)}<option
																		value={item}>{item}</option
																	>{/each}</select
															></label
														>
													</div>
													<label
														><span>Dialogue</span><textarea name="dialogue"
															>{shot.dialogue}</textarea
														></label
													><label
														><span>Continuity</span><textarea name="continuityNotes"
															>{shot.continuityNotes}</textarea
														></label
													><button class="button primary">Save shot</button>
												</form>
											</details>
										</div>
									</article>{/if}{/each}
						</div>
					</div>{/each}
			</section>{/each}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Canonical order</p>
			<h3>Sequence-safe reordering</h3>
			<p>Arrow controls update the same shot positions used everywhere else in FrameForge.</p>
		</div>{/snippet}</AppShell
>
