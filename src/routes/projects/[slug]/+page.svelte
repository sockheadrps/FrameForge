<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	const shotCount = $derived(
		data.project.episodes.reduce(
			(total, episode) =>
				total + episode.scenes.reduce((sum, scene) => sum + scene.shots.length, 0),
			0
		)
	);
	async function reorder(
		action: 'reorderEpisodes' | 'reorderScenes' | 'reorderShots',
		parentId: string,
		ids: string[],
		draggedId: string,
		targetId: string
	) {
		if (draggedId === targetId) return;
		const orderedIds = ids.filter((id) => id !== draggedId);
		orderedIds.splice(orderedIds.indexOf(targetId), 0, draggedId);
		const body = new FormData();
		body.set('parentId', parentId);
		body.set('orderedIds', JSON.stringify(orderedIds));
		await fetch(`?/${action}`, { method: 'POST', body });
		await invalidateAll();
	}
</script>

<svelte:head><title>{data.project.title} · FrameForge</title></svelte:head>
<AppShell active="projects" inspectorTitle="Project details">
	<div class="workspace story-workspace">
		<a class="back-link" href={resolve('/projects')}>← All projects</a>
		<header class="project-heading">
			<div>
				<p class="eyebrow">{data.project.status}</p>
				<h1>{data.project.title}</h1>
				<p>{data.project.logline || 'Add a logline to define the heart of this production.'}</p>
			</div>
			<details class="menu-details">
				<summary class="button secondary-button">Edit project</summary>
				<form method="POST" action="?/updateProject" class="popover-form">
					<label><span>Title</span><input name="title" value={data.project.title} required /></label
					>
					<label><span>Logline</span><input name="logline" value={data.project.logline} /></label>
					<label><span>Genre</span><input name="genre" value={data.project.genre} /></label>
					<label
						><span>Status</span><select name="status" value={data.project.status}
							><option value="concept">Concept</option><option value="pre-production"
								>Pre-production</option
							><option value="production">Production</option><option value="review">Review</option
							><option value="complete">Complete</option><option value="archived">Archived</option
							></select
						></label
					>
					<label
						><span>Synopsis</span><textarea name="synopsis" rows="3"
							>{data.project.synopsis}</textarea
						></label
					>
					<label
						><span>Visual style</span><textarea name="visualStyle" rows="3"
							>{data.project.visualStyle}</textarea
						></label
					>
					<button class="button primary">Save project</button>
				</form>
			</details>
		</header>
		<div class="project-utility-links">
			<a
				class="project-search-link"
				href={resolve('/projects/[slug]/search', { slug: data.project.slug })}
				>Search this project →</a
			><a href={resolve('/api/projects/[slug]/package', { slug: data.project.slug })}
				>Export portable package ↓</a
			>
		</div>
		<nav class="mode-tabs" aria-label="Project modes">
			<a class="active" href="#story">Story</a><a
				href={resolve('/projects/[slug]/canvas', { slug: data.project.slug })}>Canvas</a
			><a href={resolve('/projects/[slug]/storyboard', { slug: data.project.slug })}>Storyboard</a
			><a href={resolve('/projects/[slug]/review', { slug: data.project.slug })}>Review</a><a
				href={resolve('/projects/[slug]/takes', { slug: data.project.slug })}>Takes</a
			><a href={resolve('/projects/[slug]/prompts', { slug: data.project.slug })}>Prompts</a><a
				href={resolve('/projects/[slug]/continuity', { slug: data.project.slug })}>Continuity</a
			>
		</nav>
		{#if form?.message}<p class="form-error" role="alert">{form.message}</p>{/if}
		<section id="story" class="story-section">
			<div class="section-heading">
				<div>
					<p class="eyebrow">Story hierarchy</p>
					<h2>Episodes & scenes</h2>
				</div>
				<details class="menu-details">
					<summary class="button primary">Add episode</summary>
					<form method="POST" action="?/createEpisode" class="popover-form">
						<label
							><span>Episode title</span><input
								name="title"
								required
								placeholder="Episode 01"
							/></label
						><label><span>Synopsis</span><textarea name="synopsis" rows="3"></textarea></label
						><button class="button primary">Create episode</button>
					</form>
				</details>
			</div>
			{#if data.project.episodes.length}
				<div class="story-tree">
					{#each data.project.episodes as episode, episodeIndex (episode.id)}
						<article
							class="episode-card"
							draggable="true"
							ondragstart={(event) => event.dataTransfer?.setData('text/plain', episode.id)}
							ondragover={(event) => event.preventDefault()}
							ondrop={(event) => {
								event.preventDefault();
								void reorder(
									'reorderEpisodes',
									data.project.id,
									data.project.episodes.map((item) => item.id),
									event.dataTransfer?.getData('text/plain') ?? '',
									episode.id
								);
							}}
						>
							<header>
								<span class="order-number">{String(episodeIndex + 1).padStart(2, '0')}</span>
								<div>
									<p class="eyebrow">Episode</p>
									<h3>{episode.title}</h3>
									<p>{episode.synopsis || 'No episode synopsis yet.'}</p>
								</div>
								<details class="inline-details">
									<summary aria-label="Edit episode">•••</summary>
									<form method="POST" action="?/updateEpisode" class="popover-form">
										<input type="hidden" name="id" value={episode.id} /><label
											><span>Title</span><input
												name="title"
												value={episode.title}
												required
											/></label
										><label
											><span>Synopsis</span><textarea name="synopsis" rows="3"
												>{episode.synopsis}</textarea
											></label
										><button class="button primary">Save</button>
									</form>
									<form method="POST" action="?/deleteEpisode">
										<input type="hidden" name="id" value={episode.id} /><button
											class="danger-button">Delete episode</button
										>
									</form>
								</details>
							</header>
							<div class="scene-list">
								{#each episode.scenes as scene, sceneIndex (scene.id)}
									<section
										class="scene-card"
										role="listitem"
										draggable="true"
										ondragstart={(event) => {
											event.stopPropagation();
											event.dataTransfer?.setData('text/plain', scene.id);
										}}
										ondragover={(event) => event.preventDefault()}
										ondrop={(event) => {
											event.preventDefault();
											event.stopPropagation();
											void reorder(
												'reorderScenes',
												episode.id,
												episode.scenes.map((item) => item.id),
												event.dataTransfer?.getData('text/plain') ?? '',
												scene.id
											);
										}}
									>
										<header>
											<span>{episodeIndex + 1}.{sceneIndex + 1}</span>
											<div>
												<h4>{scene.title}</h4>
												<p>{scene.location || scene.description || 'No scene details yet.'}</p>
											</div>
											<details class="inline-details">
												<summary aria-label="Edit scene">•••</summary>
												<form method="POST" action="?/updateScene" class="popover-form">
													<input type="hidden" name="id" value={scene.id} /><label
														><span>Title</span><input
															name="title"
															value={scene.title}
															required
														/></label
													><label
														><span>Location</span><input
															name="location"
															value={scene.location}
														/></label
													><label
														><span>Description</span><textarea name="description" rows="2"
															>{scene.description}</textarea
														></label
													><label
														><span>Narrative notes</span><textarea name="narrativeNotes" rows="2"
															>{scene.narrativeNotes}</textarea
														></label
													><button class="button primary">Save</button>
												</form>
												<form method="POST" action="?/deleteScene">
													<input type="hidden" name="id" value={scene.id} /><button
														class="danger-button">Delete scene</button
													>
												</form>
											</details>
										</header>
										<div class="shot-list">
											{#each scene.shots as shot, shotIndex (shot.id)}<article
													class="shot-row"
													draggable="true"
													ondragstart={(event) => {
														event.stopPropagation();
														event.dataTransfer?.setData('text/plain', shot.id);
													}}
													ondragover={(event) => event.preventDefault()}
													ondrop={(event) => {
														event.preventDefault();
														event.stopPropagation();
														void reorder(
															'reorderShots',
															scene.id,
															scene.shots.map((item) => item.id),
															event.dataTransfer?.getData('text/plain') ?? '',
															shot.id
														);
													}}
												>
													<span class="shot-code">SH {String(shotIndex + 1).padStart(2, '0')}</span>
													<div>
														<strong>{shot.title}</strong><small
															>{shot.actionDescription || 'No action description'} · {(
																shot.targetDurationMs / 1000
															).toFixed(1)}s</small
														>
													</div>
													<span class="shot-status">{shot.status}</span>
													<details class="inline-details">
														<summary aria-label="Edit shot">•••</summary>
														<form
															method="POST"
															action="?/updateShot"
															class="popover-form shot-form"
														>
															<input type="hidden" name="id" value={shot.id} /><label
																><span>Title</span><input
																	name="title"
																	value={shot.title}
																	required
																/></label
															><label
																><span>Status</span><select name="status" value={shot.status}
																	><option value="planned">Planned</option><option value="ready"
																		>Ready</option
																	><option value="generating">Generating</option><option
																		value="review">Review</option
																	><option value="approved">Approved</option><option value="blocked"
																		>Blocked</option
																	></select
																></label
															><label
																><span>Duration (ms)</span><input
																	name="targetDurationMs"
																	type="number"
																	min="0"
																	value={shot.targetDurationMs}
																/></label
															><label
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
																><span>Action</span><textarea name="actionDescription"
																	>{shot.actionDescription}</textarea
																></label
															><label
																><span>Dialogue</span><textarea name="dialogue"
																	>{shot.dialogue}</textarea
																></label
															><label
																><span>Continuity</span><textarea name="continuityNotes"
																	>{shot.continuityNotes}</textarea
																></label
															><button class="button primary">Save</button>
														</form>
														<form method="POST" action="?/deleteShot">
															<input type="hidden" name="id" value={shot.id} /><button
																class="danger-button">Delete shot</button
															>
														</form>
													</details>
												</article>{/each}
										</div>
										<details class="add-child">
											<summary>＋ Add shot</summary>
											<form method="POST" action="?/createShot" class="popover-form shot-form">
												<input type="hidden" name="sceneId" value={scene.id} /><label
													><span>Shot title</span><input name="title" required /></label
												><label
													><span>Target duration (ms)</span><input
														name="targetDurationMs"
														type="number"
														min="0"
														value="0"
													/></label
												><label
													><span>Action</span><textarea name="actionDescription"></textarea></label
												><input type="hidden" name="cameraFraming" /><input
													type="hidden"
													name="cameraMovement"
												/><input type="hidden" name="dialogue" /><input
													type="hidden"
													name="continuityNotes"
												/><input type="hidden" name="status" value="planned" /><button
													class="button primary">Create shot</button
												>
											</form>
										</details>
									</section>
								{/each}
								<details class="add-child">
									<summary>＋ Add scene</summary>
									<form method="POST" action="?/createScene" class="popover-form">
										<input type="hidden" name="episodeId" value={episode.id} /><label
											><span>Scene title</span><input name="title" required /></label
										><label><span>Location</span><input name="location" /></label><label
											><span>Description</span><textarea name="description"></textarea></label
										><input type="hidden" name="narrativeNotes" /><button class="button primary"
											>Create scene</button
										>
									</form>
								</details>
							</div>
						</article>
					{/each}
				</div>
			{:else}<div class="empty-story">
					<p>Your story structure is empty.</p>
					<span>Add the first episode to begin.</span>
				</div>{/if}
		</section>
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Structure</p>
			<h3>{data.project.episodes.length} episodes · {shotCount} shots</h3>
			<p>All hierarchy changes are saved directly to the local FrameForge database.</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">Danger zone</p>
			<h3>Delete project</h3>
			<p>This also removes its episodes, scenes, and shots.</p>
			<form method="POST" action="?/deleteProject">
				<button class="danger-button">Delete project</button>
			</form>
		</div>{/snippet}
</AppShell>
