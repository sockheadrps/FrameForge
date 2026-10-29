<script lang="ts">
	let {
		title,
		description,
		icon = 'empty'
	}: { title: string; description: string; icon?: string } = $props();
</script>

<div class="empty-state">
	<div class="empty-icon" aria-hidden="true">{icon === 'timeline' ? '⌁' : '◇'}</div>
	<h3>{title}</h3>
	<p>{description}</p>
</div>
