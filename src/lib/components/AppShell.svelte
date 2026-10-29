<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Snippet } from 'svelte';
	let {
		children,
		inspector,
		active = '',
		inspectorTitle = 'Inspector'
	}: {
		children: Snippet;
		inspector?: Snippet;
		active?: string;
		inspectorTitle?: string;
	} = $props();
	const navItems = [
		{ id: 'dashboard', label: 'Dashboard', href: '/', icon: '⌂' },
		{ id: 'projects', label: 'Projects', href: '/projects', icon: '▱' },
		{ id: 'library', label: 'Media library', href: '/library', icon: '◇' }
	] as const;
</script>

<div class="app-shell">
	<header class="topbar">
		<a class="brand" href={resolve('/')} aria-label="FrameForge home"
			><span class="brand-symbol" aria-hidden="true"><i></i><i></i><i></i></span><span
				>FRAME<strong>FORGE</strong></span
			></a
		>
		<div class="topbar-actions">
			<button class="icon-button" aria-label="Search"><span aria-hidden="true">⌕</span></button
			><button class="icon-button notification" aria-label="Notifications"
				><span aria-hidden="true">◌</span></button
			>
		</div>
	</header>
	<aside class="sidebar" aria-label="Primary navigation">
		<nav>
			<p class="nav-label">Workspace</p>
			{#each navItems as item (item.id)}<a
					class:active={active === item.id}
					href={resolve(item.href)}
					><span class="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</a
				>{/each}
			<p class="nav-label secondary">System</p>
			<a class:active={active === 'settings'} href={resolve('/settings')}
				><span class="nav-icon" aria-hidden="true">⚙</span>Settings</a
			>
		</nav>
		<div class="sidebar-footer">
			<span class="storage-icon" aria-hidden="true">⬡</span>
			<div><strong>Local workspace</strong><span>All systems ready</span></div>
			<i class="health-dot" aria-hidden="true"></i>
		</div>
	</aside>
	<main>{@render children()}</main>
	<aside class="inspector" aria-label={inspectorTitle}>
		<header>
			<p class="eyebrow">Inspector</p>
			<h2>{inspectorTitle}</h2>
		</header>
		{#if inspector}{@render inspector()}{/if}
	</aside>
</div>
