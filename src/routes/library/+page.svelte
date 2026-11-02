<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import AppShell from '#lib/components/AppShell.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let uploadMessage = $state('');
	let uploading = $state(false);

	function folderHref(path: string, rootId = data.rootId) {
		const query: string[] = [];
		if (rootId) query.push(`root=${encodeURIComponent(rootId)}`);
		if (path) query.push(`path=${encodeURIComponent(path)}`);
		return `${resolve('/library')}?${query.join('&')}`;
	}

	function mediaHref(path: string) {
		return data.rootId
			? resolve('/media/linked/[rootId]/[...path]', { rootId: data.rootId, path })
			: '';
	}

	function parentPath() {
		return data.path.split('/').slice(0, -1).join('/');
	}

	function formatSize(bytes?: number) {
		if (bytes === undefined) return '';
		if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function assetHref(asset: (typeof data.assets)[number], thumbnail = false) {
		if (asset.storageType === 'managed')
			return `${resolve('/media/managed/[assetId]', { assetId: asset.id })}${thumbnail && asset.thumbnailPath ? '?thumbnail=1' : ''}`;
		return asset.linkedRootId && asset.linkedRelativePath
			? resolve('/media/linked/[rootId]/[...path]', {
					rootId: asset.linkedRootId,
					path: asset.linkedRelativePath
				})
			: '';
	}
	function assetPageHref(page: number) {
		const query = [`assetPage=${page}`];
		if (data.selectedProjectId) query.push(`project=${encodeURIComponent(data.selectedProjectId)}`);
		if (data.rootId) query.push(`root=${encodeURIComponent(data.rootId)}`);
		if (data.path) query.push(`path=${encodeURIComponent(data.path)}`);
		return `${resolve('/library')}?${query.join('&')}`;
	}

	async function upload(event: SubmitEvent) {
		event.preventDefault();
		const uploadForm = event.currentTarget as HTMLFormElement;
		const file = (uploadForm.elements.namedItem('file') as HTMLInputElement).files?.[0];
		const projectId = (uploadForm.elements.namedItem('projectId') as HTMLSelectElement).value;
		if (!file || !projectId) return;
		uploading = true;
		uploadMessage = 'Uploading…';
		try {
			const response = await fetch(
				`${resolve('/api/assets/upload')}?projectId=${encodeURIComponent(projectId)}`,
				{
					method: 'POST',
					headers: {
						'x-frameforge-filename': encodeURIComponent(file.name),
						'content-type': 'application/octet-stream'
					},
					body: file
				}
			);
			const result = await response.json();
			uploadMessage = result.message ?? (response.ok ? 'Upload complete.' : 'Upload failed.');
			if (response.ok) {
				uploadForm.reset();
				if (projectId !== data.selectedProjectId) {
					const next = new URL(window.location.href);
					next.searchParams.set('project', projectId);
					// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL retains this resolved route and changes only its query.
					await goto(next);
				} else await invalidateAll();
			}
		} catch {
			uploadMessage = 'Upload failed before reaching FrameForge.';
		} finally {
			uploading = false;
		}
	}
</script>

<!-- Dynamic links below are assembled from resolve() results and encoded query/path parameters. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->

<svelte:head><title>Media library · FrameForge</title></svelte:head>
<AppShell active="library" inspectorTitle="Linked media">
	<div class="workspace media-workspace">
		<header class="page-heading">
			<div>
				<p class="eyebrow">ComfyUI outputs</p>
				<h1>Media library</h1>
				<p>Browse approved output folders without moving or modifying source files.</p>
			</div>
		</header>

		{#if data.projects.length}
			<section class="managed-library" aria-labelledby="managed-heading">
				<div class="section-heading">
					<div>
						<p class="eyebrow">FrameForge storage</p>
						<h2 id="managed-heading">Project assets</h2>
					</div>
				</div>
				<form method="POST" action="?/createTag" class="tag-create-form">
					<input type="hidden" name="projectId" value={data.selectedProjectId ?? ''} />
					<input
						name="name"
						maxlength="80"
						placeholder="New tag"
						aria-label="New tag name"
						required
					/>
					<button>Add tag</button>
				</form>
				<form class="upload-bar" onsubmit={upload}>
					<select name="projectId" aria-label="Upload project">
						{#each data.projects as project (project.id)}<option
								value={project.id}
								selected={project.id === data.selectedProjectId}>{project.title}</option
							>{/each}
					</select>
					<input
						name="file"
						type="file"
						accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
						required
						aria-label="Media file"
					/>
					<button class="button primary" disabled={uploading}
						>{uploading ? 'Uploading…' : 'Upload media'}</button
					>
				</form>
				{#if uploadMessage}<p class="upload-message" role="status">{uploadMessage}</p>{/if}
				{#if data.assets.length}
					<div class="asset-strip">
						{#each data.assets as asset (asset.id)}
							<article class="asset-detail-card">
								<a class="asset-thumb" href={assetHref(asset)} target="_blank"
									>{#if asset.mediaType === 'image' || asset.thumbnailPath}<img
											src={assetHref(asset, true)}
											alt=""
											loading="lazy"
										/>{:else}<span aria-hidden="true">▶</span>{/if}</a
								>
								<div class="asset-detail-copy">
									<strong title={asset.originalName}>{asset.originalName}</strong><small
										>{asset.category} · {formatSize(asset.sizeBytes)}{#if asset.width}
											· {asset.width}×{asset.height}{/if}{#if asset.durationMs}
											· {(asset.durationMs / 1000).toFixed(1)}s{/if}</small
									>
									<div class="tag-row">
										{#if !asset.sourceStatus.available}<span class="warning-tag">missing</span
											>{:else if asset.sourceStatus.modified}<span class="warning-tag"
												>source changed</span
											>{/if}
										{#each asset.tagAssignments as assignment (assignment.tagId)}<span
												>{assignment.tag.name}</span
											>{/each}
									</div>
								</div>
								<details class="asset-actions">
									<summary aria-label="Edit {asset.originalName}">•••</summary>
									<form method="POST" action="?/updateAsset" class="popover-form">
										<input type="hidden" name="id" value={asset.id} /><label
											><span>Category</span><select name="category" value={asset.category}
												><option value="general">General</option><option value="character"
													>Character</option
												><option value="location">Location</option><option value="prop">Prop</option
												><option value="style">Style</option><option value="start-frame"
													>Start frame</option
												><option value="end-frame">End frame</option><option value="source"
													>Source</option
												><option value="output-image">Output image</option><option
													value="output-video">Output video</option
												></select
											></label
										><label
											><span>Notes</span><textarea name="notes" rows="3">{asset.notes}</textarea
											></label
										><button class="button primary">Save details</button>
									</form>
									{#if data.tags.length}<form
											method="POST"
											action="?/assignTag"
											class="mini-asset-form"
										>
											<input type="hidden" name="assetId" value={asset.id} /><select
												name="tagId"
												aria-label="Tag"
												><option value="">Choose tag</option
												>{#each data.tags as tag (tag.id)}<option value={tag.id}>{tag.name}</option
													>{/each}</select
											><button>Assign tag</button>
										</form>{/if}
									{#if data.shotOptions.length}<form
											method="POST"
											action="?/linkShot"
											class="mini-asset-form"
										>
											<input type="hidden" name="assetId" value={asset.id} /><select
												name="shotId"
												aria-label="Shot"
												><option value="">Choose shot</option
												>{#each data.shotOptions as shot (shot.id)}<option value={shot.id}
														>{shot.label}</option
													>{/each}</select
											><input name="role" value="reference" aria-label="Asset role" /><button
												>Link shot</button
											>
										</form>{/if}
								</details>
							</article>
						{/each}
					</div>
					{#if data.assetPageCount > 1}<nav class="asset-pagination" aria-label="Asset pages">
							<a
								aria-disabled={data.assetPage === 1}
								href={assetPageHref(Math.max(1, data.assetPage - 1))}>← Previous</a
							><span>Page {data.assetPage} of {data.assetPageCount}</span><a
								aria-disabled={data.assetPage === data.assetPageCount}
								href={assetPageHref(Math.min(data.assetPageCount, data.assetPage + 1))}>Next →</a
							>
						</nav>{/if}
				{:else}<p class="no-assets">No canonical assets in this project yet.</p>{/if}
			</section>
		{/if}

		{#if data.roots.length}
			<div class="media-toolbar">
				<nav class="root-tabs" aria-label="Linked media sources">
					{#each data.roots as root (root.id)}
						<a
							class:active={root.id === data.rootId}
							class:unavailable={!root.available}
							href={folderHref('', root.id)}><i aria-hidden="true"></i>{root.name}</a
						>
					{/each}
				</nav>
				<div class="breadcrumb" aria-label="Current media folder">
					<a href={folderHref('')}>output</a>
					{#each data.path.split('/').filter(Boolean) as segment, index (index)}
						<span aria-hidden="true">/</span><a
							href={folderHref(
								data.path
									.split('/')
									.slice(0, index + 1)
									.join('/')
							)}>{segment}</a
						>
					{/each}
				</div>
			</div>
		{/if}
		{#if form?.message}
			<p class:success-message={form.success} class="form-error" role="status">{form.message}</p>
		{/if}

		{#if data.message}
			<EmptyState title="Media source unavailable" description={data.message} />
		{:else if data.entries.length}
			<div class="media-grid">
				{#if data.path}<a class="media-card folder-card" href={folderHref(parentPath())}
						><span class="folder-icon" aria-hidden="true">↰</span>
						<div><strong>Parent folder</strong><small>Go up one level</small></div></a
					>{/if}
				{#each data.entries as entry (entry.path)}
					{#if entry.kind === 'directory'}
						<a class="media-card folder-card" href={folderHref(entry.path)}
							><span class="folder-icon" aria-hidden="true">▰</span>
							<div><strong>{entry.name}</strong><small>Folder</small></div></a
						>
					{:else}
						<article class="media-card file-card">
							<a class="media-preview" href={mediaHref(entry.path)} target="_blank">
								{#if entry.kind === 'image'}<img
										src={mediaHref(entry.path)}
										alt=""
										loading="lazy"
									/>{:else}<video
										src={mediaHref(entry.path)}
										preload="metadata"
										muted
										aria-label={entry.name}
									></video><span class="video-badge">Video</span>{/if}
							</a>
							<div class="media-caption">
								<strong title={entry.name}>{entry.name}</strong><small
									>{formatSize(entry.size)}</small
								>
							</div>
							{#if data.projects.length}
								<form method="POST" action="?/linkAsset" class="asset-link-form">
									<input type="hidden" name="rootId" value={data.rootId ?? ''} />
									<input type="hidden" name="relativePath" value={entry.path} />
									<select name="projectId" aria-label="Project for {entry.name}">
										{#each data.projects as project (project.id)}<option value={project.id}
												>{project.title}</option
											>{/each}
									</select>
									<button aria-label="Add {entry.name} to project">Add</button>
								</form>
							{/if}
						</article>
					{/if}
				{/each}
			</div>
		{:else}
			<EmptyState
				title="This folder is empty"
				description="No supported PNG, JPEG, WebP, MP4, or WebM files were found."
			/>
		{/if}
	</div>
	{#snippet inspector()}
		<div class="inspector-block">
			<p class="step-label">Read-only source</p>
			<h3>/mnt/data/comfy/output</h3>
			<p>
				FrameForge can preview files and navigate subfolders but will never modify ComfyUI output
				files.
			</p>
		</div>
		<div class="inspector-block muted">
			<p class="step-label">Supported</p>
			<h3>Images & video</h3>
			<p>PNG, JPEG, WebP, MP4, and WebM. Other file types remain hidden.</p>
		</div>
	{/snippet}
</AppShell>
