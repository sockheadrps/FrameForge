<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · FrameForge</title></svelte:head>
<main class="error-page">
	<a class="brand" href={resolve('/')}
		><span class="brand-symbol"><i></i><i></i><i></i></span>FRAME<strong>FORGE</strong></a
	>
	<p class="eyebrow">Error {page.status}</p>
	<h1>The frame went missing.</h1>
	<p>{page.error?.message ?? 'We could not open this part of the production.'}</p>
	<a class="button primary" href={resolve('/')}>Return to dashboard</a>
</main>
