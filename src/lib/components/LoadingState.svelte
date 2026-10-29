<script lang="ts">
	let { label = 'Loading workspace' }: { label?: string } = $props();
</script>

<div class="loading-state" role="status" aria-live="polite">
	<span class="loading-mark" aria-hidden="true"><i></i><i></i><i></i></span>
	<span>{label}</span>
</div>
