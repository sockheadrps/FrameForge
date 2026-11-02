<script lang="ts">
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let sceneId = $state(untrack(() => data.scenes[0]?.id || ''));
	let active = $state(0);
	let scene = $derived(data.scenes.find((item) => item.id === sceneId));
	let sequence = $derived(scene?.shots.filter((shot) => shot.approved) ?? []);
	let current = $derived(sequence[active]);
	function href(
		asset: NonNullable<(typeof data.scenes)[number]['shots'][number]['approved']>['outputAsset']
	) {
		return asset.storageType === 'managed'
			? resolve('/media/managed/[assetId]', { assetId: asset.id })
			: asset.linkedRootId && asset.linkedRelativePath
				? resolve('/media/linked/[rootId]/[...path]', {
						rootId: asset.linkedRootId,
						path: asset.linkedRelativePath
					})
				: '';
	}
	function changeScene(event: Event) {
		sceneId = (event.currentTarget as HTMLSelectElement).value;
		active = 0;
	}
	function move(offset: number) {
		active = Math.max(0, Math.min(sequence.length - 1, active + offset));
	}
</script>

<svelte:head><title>Sequence review · {data.project.title}</title></svelte:head><AppShell
	active="projects"
	inspectorTitle="Sequence"
	><div class="workspace review-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">Approved sequence</p>
				<h1>Scene review</h1>
				<p>Play approved takes in canonical story order and inspect target versus actual timing.</p>
			</div>
			<select value={sceneId} onchange={changeScene}
				>{#each data.scenes as item (item.id)}<option value={item.id}>{item.label}</option
					>{/each}</select
			>
		</header>
		{#if form?.message}<p class:success-message={form.success} class="form-error">
				{form.message}
			</p>{/if}{#if current && current.approved}<section class="sequence-player">
				{#if current.approved.outputAsset.mediaType === 'video'}<!-- svelte-ignore a11y_media_has_caption --><video
						src={href(current.approved.outputAsset)}
						controls
						autoplay
						onended={() => move(1)}
					></video>{:else}<img
						src={href(current.approved.outputAsset)}
						alt={current.approved.outputAsset.originalName}
					/>{/if}
				<div class="sequence-controls">
					<button onclick={() => move(-1)} disabled={active === 0}>← Previous</button>
					<div>
						<strong>{active + 1}. {current.title}</strong><span
							>Target {(current.targetDurationMs / 1000).toFixed(1)}s · Actual {(
								(current.approved.outputAsset.durationMs ?? 0) / 1000
							).toFixed(1)}s</span
						>
					</div>
					<button onclick={() => move(1)} disabled={active === sequence.length - 1}>Next →</button>
				</div>
				<form method="POST" action="?/markers" class="marker-form">
					<input type="hidden" name="takeId" value={current.approved.id} /><label
						><span>Review in (seconds)</span><input
							type="number"
							step="0.01"
							min="0"
							name="reviewIn"
							value={current.approved.reviewInMs === null ? '' : current.approved.reviewInMs / 1000}
						/></label
					><label
						><span>Review out (seconds)</span><input
							type="number"
							step="0.01"
							min="0"
							name="reviewOut"
							value={current.approved.reviewOutMs === null
								? ''
								: current.approved.reviewOutMs / 1000}
						/></label
					><button class="button primary">Save markers</button>
				</form>
			</section>
			<nav class="sequence-strip">
				{#each sequence as shot, index (shot.id)}<button
						class:active={index === active}
						onclick={() => (active = index)}
						><span>{index + 1}</span>{shot.title}<small
							>{((shot.approved?.outputAsset.durationMs ?? shot.targetDurationMs) / 1000).toFixed(
								1
							)}s</small
						></button
					>{/each}
			</nav>{:else}<div class="empty-state">
				<h2>No approved takes in this scene</h2>
				<p>Approve a take for at least one shot to build the review sequence.</p>
			</div>{/if}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Export decision</p>
			<h3>Playback before rendering</h3>
			<p>
				Sequence playback is stable; FFmpeg concatenation remains optional because source clips may
				use incompatible codecs and dimensions.
			</p>
		</div>{/snippet}</AppShell
>
