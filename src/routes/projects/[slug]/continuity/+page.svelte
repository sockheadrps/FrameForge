<script lang="ts">
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	function href(asset: (typeof data.assets)[number]) {
		return asset.storageType === 'managed'
			? resolve('/media/managed/[assetId]', { assetId: asset.id })
			: asset.linkedRootId && asset.linkedRelativePath
				? resolve('/media/linked/[rootId]/[...path]', {
						rootId: asset.linkedRootId,
						path: asset.linkedRelativePath
					})
				: '';
	}
</script>

<svelte:head><title>Continuity · {data.project.title}</title></svelte:head>
<AppShell active="projects" inspectorTitle="Continuity"
	><div class="workspace prompt-workspace">
		<a class="back-link" href={resolve('/projects/[slug]', { slug: data.project.slug })}
			>← {data.project.title}</a
		>
		<header class="project-heading">
			<div>
				<p class="eyebrow">World bible</p>
				<h1>Continuity</h1>
				<p>
					Version character, location, and prop references without rewriting historical take
					lineage.
				</p>
			</div>
			<details class="menu-details">
				<summary class="button primary">New entity</summary>
				<form method="POST" action="?/create" class="popover-form">
					<label
						><span>Type</span><select name="type"
							><option>character</option><option>location</option><option>prop</option></select
						></label
					><label><span>Name</span><input name="name" required /></label><label
						><span>Description</span><textarea name="description"></textarea></label
					><button class="button primary">Create</button>
				</form>
			</details>
		</header>
		{#if form?.message}<p class:success-message={form.success} class="form-error">
				{form.message}
			</p>{/if}{#if data.entities.length}<div class="continuity-grid">
				{#each data.entities as entity (entity.id)}<article class="continuity-card">
						<header>
							<div>
								<p class="eyebrow">{entity.type}</p>
								<h2>{entity.name}</h2>
							</div>
							<span
								>{entity.references.length} reference{entity.references.length === 1
									? ''
									: 's'}</span
							>
						</header>
						<p>{entity.description || 'No description yet.'}</p>
						<div class="reference-strip">
							{#each entity.references as reference (reference.id)}<div
									class:canonical={entity.canonicalReferenceId === reference.id}
									class="reference-version"
								>
									<img src={href(reference.asset)} alt={reference.asset.originalName} /><span
										>v{reference.versionNumber}{entity.canonicalReferenceId === reference.id
											? ' · canonical'
											: ''}</span
									>{#if entity.canonicalReferenceId !== reference.id}<form
											method="POST"
											action="?/canonical"
										>
											<input type="hidden" name="entityId" value={entity.id} /><button
												name="referenceId"
												value={reference.id}>Make canonical</button
											>
										</form>{/if}
								</div>{/each}
						</div>
						<details>
							<summary>Add reference version</summary>
							<form method="POST" action="?/reference" class="popover-form">
								<input type="hidden" name="entityId" value={entity.id} /><select name="assetId"
									>{#each data.assets as asset (asset.id)}<option value={asset.id}
											>{asset.originalName}</option
										>{/each}</select
								><textarea name="notes" placeholder="Version notes"></textarea><button
									class="button primary">Add version</button
								>
							</form>
						</details>
						<details>
							<summary>Link to story</summary>
							<form method="POST" action="?/link" class="popover-form">
								<input type="hidden" name="entityId" value={entity.id} /><label
									><span>Scene</span><select name="sceneId"
										><option value="">None</option>{#each data.scenes as scene (scene.id)}<option
												value={scene.id}>{scene.label}</option
											>{/each}</select
									></label
								><label
									><span>Shot</span><select name="shotId"
										><option value="">None</option
										>{#each data.scenes as scene (scene.id)}{#each scene.shots as shot (shot.id)}<option
													value={shot.id}>{shot.label}</option
												>{/each}{/each}</select
									></label
								><button class="button primary">Link</button>
							</form>
						</details>
						{#if entity.type === 'character'}<details>
								<summary>Character arc</summary>
								<form method="POST" action="?/arc" class="popover-form">
									<input type="hidden" name="entityId" value={entity.id} /><textarea
										name="note"
										required
										placeholder="Arc note"></textarea><label
										><input type="checkbox" name="turningPoint" /> Turning point</label
									><select name="episodeId"
										><option value="">No episode</option
										>{#each data.episodes as episode (episode.id)}<option value={episode.id}
												>{episode.title}</option
											>{/each}</select
									><select name="sceneId"
										><option value="">No scene</option
										>{#each data.scenes as scene (scene.id)}<option value={scene.id}
												>{scene.label}</option
											>{/each}</select
									><button class="button primary">Save note</button>
								</form>
							</details>
							<ol class="arc-list">
								{#each entity.arcNotes as note (note.id)}<li class:turning={note.turningPoint}>
										{note.turningPoint ? 'Turning point: ' : ''}{note.note}
									</li>{/each}
							</ol>{/if}
					</article>{/each}
			</div>{:else}<EmptyState
				title="No continuity entities"
				description="Create a character, location, or prop to start a reusable world bible."
			/>{/if}
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Non-destructive</p>
			<h3>Historical references stay exact</h3>
			<p>Changing the canonical image does not rewrite the version recorded by an older take.</p>
		</div>{/snippet}</AppShell
>
