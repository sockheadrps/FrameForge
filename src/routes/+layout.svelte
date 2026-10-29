<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import '../styles.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="FrameForge — organize the story, prompts, references, and takes behind every shot."
	/>
</svelte:head>

{@render children()}
