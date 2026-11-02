<script lang="ts">
	import AppShell from '#lib/components/AppShell.svelte';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<svelte:head><title>Diagnostics · FrameForge</title></svelte:head><AppShell
	active="settings"
	inspectorTitle="Local diagnostics"
	><div class="workspace">
		<header class="page-heading">
			<div>
				<p class="eyebrow">Settings</p>
				<h1>Diagnostics</h1>
				<p>Read-only details for this local FrameForge installation.</p>
			</div>
			<span class:healthy={data.integrity === 'ok'} class="health-badge"
				>Database {data.integrity}</span
			>
		</header>
		<div class="diagnostic-grid">
			<section>
				<h2>Storage</h2>
				<dl>
					{#each Object.entries(data.config) as [key, value] (key)}<dt>{key}</dt>
						<dd>{value}</dd>{/each}
				</dl>
			</section>
			<section>
				<h2>Runtime</h2>
				<dl>
					<dt>Node</dt>
					<dd>{data.node}</dd>
					<dt>FFmpeg</dt>
					<dd>{data.ffmpeg}</dd>
					<dt>FFprobe</dt>
					<dd>{data.ffprobe}</dd>
				</dl>
			</section>
			<section>
				<h2>Records</h2>
				<dl>
					{#each Object.entries(data.counts) as [key, value] (key)}<dt>{key}</dt>
						<dd>{value}</dd>{/each}
				</dl>
			</section>
			<section>
				<h2>Linked media roots</h2>
				<dl>
					{#each data.roots as root (root.id)}<dt>{root.id}</dt>
						<dd>{root.name} · {root.available ? 'available' : 'missing'}</dd>{/each}
				</dl>
			</section>
		</div>
	</div>
	{#snippet inspector()}<div class="inspector-block">
			<p class="step-label">Logs</p>
			<h3>Structured service output</h3>
			<p>
				Unexpected request errors are emitted as JSON and available through the systemd journal on
				Ubuntu.
			</p>
		</div>{/snippet}</AppShell
>
