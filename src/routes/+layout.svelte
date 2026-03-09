<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import User from '$lib/components/icons/User.svelte';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { addFormMessage } from '$lib/stores/addForm';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let userMenuOpen = $state(false);
	let userMenuWrap: HTMLDivElement;

	onMount(() => {
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const setTheme = () => {
			document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
		};
		setTheme();
		mq.addEventListener('change', setTheme);
		return () => mq.removeEventListener('change', setTheme);
	});

	function handleClickOutside(e: MouseEvent) {
		if (userMenuOpen && userMenuWrap && !userMenuWrap.contains(e.target as Node)) {
			userMenuOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app">
	<header class="header" class:menu-open={userMenuOpen}>
		<div class="brand">
			<a href="/" class="logo">Kinoline</a>
			<span class="tagline">Curate. Queue. Watch.</span>
		</div>
		{#if data.user}
			<div class="header-add-wrap">
				<form
					method="post"
					action="/?/add"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure' && result.data?.message) {
								addFormMessage.set(result.data.message as string);
							} else {
								addFormMessage.set(null);
							}
							await update();
							await invalidateAll();
						};
					}}
					class="header-add-form"
					role="search"
					aria-label="Add movie to watchlist"
				>
					<input
						type="text"
						name="title"
						placeholder="Add a movie…"
						required
						aria-label="Movie title"
						autocomplete="off"
						class="header-add-input"
						oninput={() => addFormMessage.set(null)}
					/>
					<button type="submit" class="header-add-btn" title="Add movie">
						<Plus size={18} />
						<span>Add</span>
					</button>
				</form>
				{#if $addFormMessage}
					<p class="header-add-error" role="alert">{$addFormMessage}</p>
				{/if}
			</div>
			<div class="user-menu-wrap" bind:this={userMenuWrap}>
				<button
					type="button"
					class="user-menu-trigger"
					title={data.user.email}
					aria-expanded={userMenuOpen}
					aria-haspopup="true"
					aria-controls="user-menu"
					id="user-menu-trigger"
					onclick={() => (userMenuOpen = !userMenuOpen)}
				>
					<User size={18} />
					<span class="user-menu-trigger-label">{data.user.name?.trim() || data.user.email}</span>
				</button>
				{#if userMenuOpen}
					<div
						class="user-menu"
						id="user-menu"
						role="menu"
						aria-labelledby="user-menu-trigger"
					>
						<form method="post" action="/demo/better-auth?/signOut" class="user-menu-item-form" role="none">
							<button type="submit" class="user-menu-item" role="menuitem" title="Sign out">
								<LogOut size={18} />
								Sign out
							</button>
						</form>
					</div>
				{/if}
			</div>
		{:else}
			<a href="/demo/better-auth/login" class="login-link">Log in</a>
		{/if}
	</header>

	{#if userMenuOpen}
		<div
			class="user-menu-backdrop"
			onclick={() => (userMenuOpen = false)}
			aria-hidden="true"
		></div>
	{/if}

	<main class="main">
		{@render children()}
	</main>
	<!-- VHS/CRT overlay: scanlines + grain + subtle blue tint (pointer-events: none) -->
	<div class="vhs-overlay" aria-hidden="true"></div>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		font-family: 'Instrument Sans', -apple-system, BlinkMacSystemFont, sans-serif;
		font-size: 1rem;
		line-height: 1.5;
		color: var(--text);
		background: var(--bg);
		-webkit-font-smoothing: antialiased;
	}

	:global(html) {
		color-scheme: light dark;
		--bg: #f5f5f5;
		--text: #1a1a1a;
		--text-muted: #444;
		--border: #e5e5e5;
		--input-bg: #fff;
		--input-border: #ccc;
		--card-bg: #fff;
		--btn-primary-bg: #1a1a1a;
		--btn-primary-hover: #333;
		--link: #0066cc;
		--focus-ring: rgba(0, 102, 204, 0.2);
		--error: #c00;
		--watched-badge-bg: #e8f5e9;
		--watched-badge-text: #2e7d32;
		--watched-badge-border: #a5d6a7;
		--poster-bg: #ebebeb;
		--poster-text: #555;
		--card-accent: #1a1a1a;
		--card-accent-muted: #666;
		--float-menu-bg: rgba(38, 38, 42, 0.78);
		--float-menu-border: rgba(255, 255, 255, 0.06);
		--float-menu-input-bg: rgba(255, 255, 255, 0.08);
		--float-menu-input-border: rgba(255, 255, 255, 0.12);
		--float-menu-btn-bg: rgba(255, 255, 255, 0.12);
		--float-menu-btn-border: rgba(255, 255, 255, 0.18);
		--float-menu-btn-text: #fff;
		--float-menu-btn-hover: rgba(255, 255, 255, 0.2);
		--float-menu-text: #fff;
		--float-menu-muted: rgba(255, 255, 255, 0.55);
		--float-menu-error: #ff8a80;
	}

	@media (prefers-color-scheme: dark) {
		:global(html) {
			--bg: #0f0f0f;
			--text: #fafafa;
			--text-muted: #a1a1aa;
			--border: #27272a;
			--input-bg: #18181b;
			--input-border: #3f3f46;
			--card-bg: #18181b;
			--btn-primary-bg: #fafafa;
			--btn-primary-hover: #e4e4e7;
			--link: #60a5fa;
			--focus-ring: rgba(96, 165, 250, 0.35);
			--error: #f87171;
			--watched-badge-bg: #14532d;
			--watched-badge-text: #4ade80;
			--watched-badge-border: #166534;
			--poster-bg: #27272a;
			--poster-text: #a1a1aa;
			--card-accent: #fafafa;
			--card-accent-muted: #a1a1aa;
			--float-menu-bg: rgba(24, 24, 27, 0.88);
			--float-menu-border: rgba(255, 255, 255, 0.08);
			--float-menu-input-bg: rgba(255, 255, 255, 0.06);
			--float-menu-input-border: rgba(255, 255, 255, 0.1);
			--float-menu-btn-bg: #3b82f6;
			--float-menu-btn-border: #3b82f6;
			--float-menu-btn-text: #fff;
			--float-menu-btn-hover: #60a5fa;
			--float-menu-text: #fafafa;
			--float-menu-muted: rgba(255, 255, 255, 0.5);
			--float-menu-error: #f87171;
		--vhs-blue: #0000CC;
		}
	}

	/* Dark theme via data-theme so Add CTA and float menu always match when dark */
	:global(html[data-theme='dark']) {
		--bg: #0f0f0f;
		--text: #fafafa;
		--text-muted: #a1a1aa;
		--border: #27272a;
		--input-bg: #18181b;
		--input-border: #3f3f46;
		--card-bg: #18181b;
		--btn-primary-bg: #fafafa;
		--btn-primary-hover: #e4e4e7;
		--link: #60a5fa;
		--focus-ring: rgba(96, 165, 250, 0.35);
		--error: #f87171;
		--watched-badge-bg: #14532d;
		--watched-badge-text: #4ade80;
		--watched-badge-border: #166534;
		--poster-bg: #27272a;
		--poster-text: #a1a1aa;
		--card-accent: #fafafa;
		--card-accent-muted: #a1a1aa;
		--float-menu-bg: rgba(24, 24, 27, 0.88);
		--float-menu-border: rgba(255, 255, 255, 0.08);
		--float-menu-input-bg: rgba(255, 255, 255, 0.06);
		--float-menu-input-border: rgba(255, 255, 255, 0.1);
		--float-menu-btn-bg: #3b82f6;
		--float-menu-btn-border: #3b82f6;
		--float-menu-btn-text: #fff;
		--float-menu-btn-hover: #60a5fa;
		--float-menu-text: #fafafa;
		--float-menu-muted: rgba(255, 255, 255, 0.5);
		--float-menu-error: #f87171;
		--vhs-blue: #0000CC;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
	}

	.app {
		width: 100%;
		min-height: 100vh;
		--page-padding-x: 1.5rem;
		padding: 0 1.5rem 2rem;
		box-sizing: border-box;
		position: relative;
	}

	/* VHS/CRT screen effect: scanlines, grain, subtle blue tint (old recorded-movie look) */
	.vhs-overlay {
		position: fixed;
		inset: 0;
		z-index: 9998;
		pointer-events: none;
		background-image:
			repeating-linear-gradient(
				0deg,
				transparent 0px,
				transparent 2px,
				rgba(0, 0, 0, 0.07) 2px,
				rgba(0, 0, 0, 0.07) 4px
			),
			linear-gradient(180deg, rgba(0, 0, 204, 0.04) 0%, transparent 30%, transparent 70%, rgba(0, 0, 204, 0.03) 100%);
		background-size: 100% 4px, 100% 100%;
		background-repeat: repeat, no-repeat;
		opacity: 0.85;
	}
	.vhs-overlay::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		opacity: 0.03;
		mix-blend-mode: overlay;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1.25rem 0 1.5rem;
		position: relative;
	}

	.header.menu-open {
		z-index: 101;
	}

	.header-add-wrap {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.35rem;
		flex: 1;
		min-width: 0;
		max-width: 360px;
	}

	.header-add-form {
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
		height: 40px;
	}

	.header-add-input {
		flex: 1;
		min-width: 0;
		height: 100%;
		margin: 0;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		line-height: 1;
		color: var(--text);
		background: var(--input-bg);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-sizing: border-box;
		-webkit-appearance: none;
		appearance: none;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.header-add-input::placeholder {
		color: var(--text-muted);
	}

	.header-add-input:hover {
		border-color: var(--input-border);
	}

	.header-add-input:focus {
		outline: none;
		border-color: var(--link);
		box-shadow: 0 0 0 2px var(--focus-ring);
	}

	.header-add-btn {
		flex-shrink: 0;
		height: 100%;
		margin: 0;
		padding: 0 1rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1;
		background: var(--btn-primary-bg);
		color: var(--card-bg);
		border: 1px solid transparent;
		border-radius: 10px;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
		box-sizing: border-box;
	}

	.header-add-btn:hover {
		background: var(--btn-primary-hover);
	}

	.header-add-btn:focus-visible {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}

	.header-add-error {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--error);
		padding: 0.25rem 0;
	}

	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.logo {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
		letter-spacing: -0.03em;
		transition: opacity 0.2s ease;
	}

	.logo:hover {
		text-decoration: none;
		opacity: 0.7;
	}

	.tagline {
		font-size: 0.8125rem;
		color: var(--text-muted);
		letter-spacing: 0.02em;
		margin-top: 0.125rem;
	}

	.user-menu-wrap {
		position: relative;
		flex-shrink: 0;
	}

	.user-menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		padding: 0.5rem 0.6rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
	}

	.user-menu-trigger:hover {
		color: var(--text);
		background: var(--input-bg);
		border-color: var(--border);
	}

	.user-menu-trigger[aria-expanded='true'] {
		color: var(--text);
		background: var(--input-bg);
		border-color: var(--border);
	}

	.user-menu-trigger-label {
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		background: rgba(0, 0, 0, 0.35);
		animation: user-menu-backdrop-in 0.2s ease-out;
	}

	@keyframes user-menu-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.user-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 180px;
		padding: 0.5rem;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
		z-index: 1;
		animation: user-menu-in 0.2s ease-out;
	}

	@keyframes user-menu-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.user-menu-item-form {
		margin: 0;
	}

	.user-menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		margin: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--text);
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease;
		text-align: left;
		box-sizing: border-box;
	}

	.user-menu-item:hover {
		background: var(--input-bg);
	}

	.login-link {
		font-size: 0.9375rem;
		color: var(--link);
		text-decoration: none;
	}

	.login-link:hover {
		text-decoration: underline;
	}

	.main {
		padding-top: 0;
	}

	:global(h1) {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 1.5rem;
		letter-spacing: -0.02em;
		color: var(--text);
	}

	:global(h2) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
		color: var(--text);
	}

	:global(p) {
		margin: 0 0 1rem;
		color: var(--text-muted);
	}

	:global(a) {
		color: var(--link);
		text-decoration: none;
	}

	:global(a:hover) {
		text-decoration: underline;
	}

	:global(ul) {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	:global(li) {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	:global(li:last-child) {
		border-bottom: none;
	}

	:global(label) {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-muted);
		margin-bottom: 0.375rem;
	}

	:global(input[type='text']),
	:global(input[type='email']),
	:global(input[type='password']) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 1rem;
		border: 1px solid var(--input-border);
		border-radius: 6px;
		background: var(--input-bg);
		color: var(--text);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	:global(input[type='text']:focus),
	:global(input[type='email']:focus),
	:global(input[type='password']:focus) {
		outline: none;
		border-color: var(--link);
		box-shadow: 0 0 0 2px var(--focus-ring);
	}

	:global(button) {
		font: inherit;
		font-size: 0.9375rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		margin-top: 0.75rem;
		background: var(--btn-primary-bg);
		color: var(--card-bg);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease, opacity 0.2s ease;
	}

	:global(button:hover) {
		background: var(--btn-primary-hover);
	}

	:global(.form-error) {
		font-size: 0.875rem;
		color: var(--error);
		margin: 0.5rem 0 0;
	}
</style>
