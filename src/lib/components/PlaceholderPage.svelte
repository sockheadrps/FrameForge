<script lang="ts">
	import AppShell from './AppShell.svelte';
	import EmptyState from './EmptyState.svelte';
	let { title, description, active }: { title: string; description: string; active: string } =
		$props();
</script>

<AppShell {active} inspectorTitle="Nothing selected"
	><div class="workspace">
		<header class="page-heading compact">
			<div>
				<p class="eyebrow">FrameForge</p>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
		</header>
		<EmptyState
			title="Ready for the next phase"
			description="This workspace is wired into the application shell and ready for its domain workflow."
		/>
	</div></AppShell
>
