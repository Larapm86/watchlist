<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import LogOut from '$lib/components/icons/LogOut.svelte';
	import Plus from '$lib/components/icons/Plus.svelte';
	import { addFormMessage } from '$lib/stores/addForm';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
	let userMenuOpen = $state(false);
	let userMenuWrap: HTMLDivElement;
	let addOverlayOpen = $state(false);
	let addOverlayInput: HTMLInputElement;
	let addOverlayPanel: HTMLDivElement;
	let addMovieCtaRef: HTMLButtonElement;
	let addOverlayPreviousFocus: HTMLElement | null = null;
	let addFormSubmitting = $state(false);
	let loginModalOpen = $state(false);
	let loginModalSubmitting = $state(false);
	let loginModalError = $state<string | null>(null);

	function getAddOverlayFocusables(): HTMLElement[] {
		if (!addOverlayPanel) return [];
		return Array.from(
			addOverlayPanel.querySelectorAll<HTMLElement>(
				'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => el.tabIndex !== -1);
	}

	function handleAddOverlayKeydown(e: KeyboardEvent) {
		if (!addOverlayOpen) return;
		if (e.key === 'Escape') {
			closeAddOverlay();
			addOverlayPreviousFocus?.focus();
			e.preventDefault();
			return;
		}
		if (e.key !== 'Tab') return;
		const focusables = getAddOverlayFocusables();
		if (focusables.length === 0) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const target = e.target as HTMLElement;
		if (e.shiftKey) {
			if (target === first) {
				e.preventDefault();
				last.focus();
			}
		} else {
			if (target === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	$effect(() => {
		if (!addOverlayOpen) return;
		addOverlayPreviousFocus = document.activeElement as HTMLElement | null;
		const t = setTimeout(() => {
			addOverlayInput?.focus();
		}, 50);
		document.addEventListener('keydown', handleAddOverlayKeydown, true);
		return () => {
			clearTimeout(t);
			document.removeEventListener('keydown', handleAddOverlayKeydown, true);
		};
	});

	onMount(() => {
		document.documentElement.setAttribute('data-theme', 'dark');
	});

	function handleClickOutside(e: MouseEvent) {
		if (userMenuOpen && userMenuWrap && !userMenuWrap.contains(e.target as Node)) {
			userMenuOpen = false;
		}
	}

	function closeAddOverlay() {
		addOverlayOpen = false;
		addFormMessage.set(null);
		requestAnimationFrame(() => addOverlayPreviousFocus?.focus());
	}

	function userInitials(user: { name?: string | null; email: string }) {
		const name = user.name?.trim();
		if (name) {
			const parts = name.split(/\s+/);
			if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
			return name.slice(0, 2).toUpperCase();
		}
		return (user.email?.slice(0, 2) ?? '?').toUpperCase();
	}
</script>

<svelte:window
	onclick={handleClickOutside}
	onkeydown={(e) => {
		if (e.key === 'Escape' && loginModalOpen) {
			loginModalOpen = false;
			loginModalError = null;
		}
	}}
/>

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
			{#if data?.user}
				<span class="tagline">Curate. Queue. Watch.</span>
			{/if}
		</div>
		{#if data?.user}
			<div class="header-actions">
				<button
					type="button"
					class="add-movie-cta"
					title="Add a movie"
					aria-label="Add a movie"
					bind:this={addMovieCtaRef}
					onclick={() => (addOverlayOpen = true)}
				>
					<span class="add-movie-cta-icon" aria-hidden="true">
						<Plus size={14} />
					</span>
					<span class="add-movie-cta-text">Add a movie</span>
				</button>
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
						{#if data.user.image}
							<img src={data.user.image} alt="" class="user-avatar" width="32" height="32" />
						{:else}
							<span class="user-avatar user-avatar-initials" aria-hidden="true">{userInitials(data.user)}</span>
						{/if}
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
			</div>
		{:else}
			<button type="button" class="login-link" onclick={() => { loginModalOpen = true; loginModalError = null; }}>Log in</button>
		{/if}
	</header>

	{#if userMenuOpen}
		<div
			class="user-menu-backdrop"
			onclick={() => (userMenuOpen = false)}
			aria-hidden="true"
		></div>
	{/if}

	{#if loginModalOpen}
		<div
			class="login-modal-backdrop"
			aria-hidden="true"
			onclick={() => { loginModalOpen = false; loginModalError = null; }}
		></div>
		<div
			class="login-modal-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="login-modal-title"
			aria-label="Log in"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 id="login-modal-title" class="login-modal-title">Welcome back</h2>
			<form
				method="post"
				action="/demo/better-auth/login?/signInEmail"
				use:enhance={() => {
					loginModalSubmitting = true;
					loginModalError = null;
					return async ({ result, update }) => {
						await update();
						if (result.type === 'failure' && result.data?.message) {
							loginModalError = result.data.message as string;
						} else {
							loginModalOpen = false;
							await invalidateAll();
						}
						loginModalSubmitting = false;
					};
				}}
				class="login-modal-form"
			>
				<label class="login-modal-label">
					<span class="login-modal-label-text">Email</span>
					<input
						type="email"
						name="email"
						autocomplete="email"
						required
						class="login-modal-input"
						placeholder="you@example.com"
					/>
				</label>
				<label class="login-modal-label">
					<span class="login-modal-label-text">Password</span>
					<input
						type="password"
						name="password"
						autocomplete="current-password"
						required
						class="login-modal-input"
						placeholder="••••••••"
					/>
				</label>
				{#if loginModalError}
					<p class="login-modal-error" role="alert">{loginModalError}</p>
				{/if}
				<button type="submit" class="login-modal-btn" disabled={loginModalSubmitting}>
					{loginModalSubmitting ? 'Signing in…' : 'Log in'}
				</button>
			</form>
		</div>
	{/if}

	{#if addOverlayOpen}
		<div
			class="add-overlay-backdrop"
			onclick={closeAddOverlay}
			aria-hidden="true"
		></div>
		<div
			class="add-overlay-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="add-movie-dialog-title"
			aria-describedby={$addFormMessage ? 'add-movie-hint add-movie-error' : 'add-movie-hint'}
			bind:this={addOverlayPanel}
		>
			<h2 id="add-movie-dialog-title" class="sr-only">Add a movie</h2>
			<form
				method="post"
				action="/?/add"
				use:enhance={() => {
					addFormSubmitting = true;
					addFormMessage.set(null);
					return async ({ result, update }) => {
						try {
							if (result.type === 'failure' && result.data?.message) {
								addFormMessage.set(result.data.message as string);
							} else {
								addFormMessage.set(null);
								closeAddOverlay();
							}
							await update();
							await invalidateAll();
						} catch (e) {
							addFormMessage.set('Something went wrong. Please try again.');
						} finally {
							addFormSubmitting = false;
						}
					};
				}}
				class="add-overlay-form"
			>
				<input
					type="text"
					name="title"
					placeholder="e.g. Past Lives, Mulan, Wonder Woman"
					required
					aria-label="Movie title"
					autocomplete="off"
					class="add-overlay-input"
					bind:this={addOverlayInput}
					oninput={() => addFormMessage.set(null)}
					disabled={addFormSubmitting}
				/>
				<p id="add-movie-hint" class="add-overlay-hint">Type a movie title and press Enter to add it.</p>
				{#if $addFormMessage}
					<p class="add-overlay-error" id="add-movie-error" role="alert">{$addFormMessage}</p>
				{/if}
			</form>
		</div>
	{/if}

	<main class="main">
		{@render children()}
	</main>
	<!-- VHS/CRT overlay: grain + neutral tint (scanlines are on posters in page) -->
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
		color-scheme: dark;
		/* Default: dark theme (no blue) */
		--bg: #0c0c0f;
		--text: #e8e8f0;
		--text-muted: #9090a0;
		--border: #252538;
		--input-bg: #12121a;
		--input-border: #2a2a3a;
		--card-bg: #12121a;
		/* Main CTA: soft elevated gray, dark text – readable, not white */
		--btn-primary-bg: #a0a0b0;
		--btn-primary-hover: #b0b0c0;
		--btn-primary-text: #0f0f14;
		--btn-primary-focus: #0f0f14;
		--link: #a8a8c0;
		--focus-ring: rgba(200, 200, 210, 0.35);
		--error: #f87171;
		--watched-badge-bg: #0d2e0d;
		--watched-badge-text: #6ee76e;
		--watched-badge-border: #1a4d1a;
		--poster-bg: #1a1a22;
		--poster-text: #9090a0;
		--card-accent: #e8e8f0;
		--card-accent-muted: #9090a0;
		--float-menu-bg: rgba(18, 18, 24, 0.92);
		--float-menu-border: rgba(255, 255, 255, 0.08);
		--float-menu-input-bg: rgba(255, 255, 255, 0.06);
		--float-menu-input-border: rgba(255, 255, 255, 0.12);
		--float-menu-btn-bg: #3a3a4a;
		--float-menu-btn-border: #4a4a5a;
		--float-menu-btn-text: #fff;
		--float-menu-btn-hover: #4a4a5a;
		--float-menu-text: #e8e8f0;
		--float-menu-muted: rgba(232, 232, 240, 0.5);
		--float-menu-error: #f87171;
		--vhs-blue: #3a3a4a;
		--neon-blue: #5c7cff;
		/* Shared modal/overlay palette (dark mode) */
		--modal-bg: #12121a;
		--modal-border: #252538;
		--modal-backdrop: rgba(8, 8, 12, 0.85);
		--modal-text: #e8e8f0;
		--modal-text-muted: #9090a0;
		--modal-input-bg: #16161d;
		--modal-input-border: #252530;
		--modal-focus-border: #5a5a6a;
		--modal-focus-ring: rgba(90, 90, 106, 0.25);
		--modal-error: #f87171;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
	}

	/* Desktop: no vertical scroll, content fits viewport */
	@media (min-height: 700px) {
		:global(html),
		:global(body) {
			height: 100%;
			overflow: hidden;
		}
		.app {
			height: 100%;
			min-height: 0;
			display: flex;
			flex-direction: column;
			padding-bottom: 1rem;
		}
		.main {
			flex: 1;
			min-height: 0;
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
	}

	.app {
		width: 100%;
		min-height: 100vh;
		--page-padding-x: 1.5rem;
		padding: 0 1.5rem 2rem;
		box-sizing: border-box;
		position: relative;
	}

	/* VHS/CRT overlay: grain + neutral dark tint (scanlines are on movie posters in page) */
	.vhs-overlay {
		position: fixed;
		inset: 0;
		z-index: 9998;
		pointer-events: none;
		background-image:
			linear-gradient(180deg, rgba(0, 0, 0, 0.03) 0%, transparent 40%, transparent 60%, rgba(0, 0, 0, 0.02) 100%);
		background-size: 100% 100%;
		background-repeat: no-repeat;
		opacity: 0.95;
	}
	.vhs-overlay::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		opacity: 0.05;
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
		z-index: 50;
	}

	.header.menu-open {
		z-index: 101;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Plus CTA: 33×33 square with rounded corners, grows right-to-left on hover */
	.add-movie-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-direction: row-reverse;
		gap: 0;
		width: 33px;
		height: 33px;
		min-width: 33px;
		margin: 0;
		padding: 0 7px;
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1;
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		border: 1px solid var(--border);
		border-radius: 8px;
		cursor: pointer;
		transition: background 0.25s ease, color 0.25s ease, min-width 0.25s ease, padding 0.25s ease, border-radius 0.25s ease, width 0.25s ease, height 0.25s ease;
		box-sizing: border-box;
		overflow: hidden;
	}

	.add-movie-cta:hover {
		justify-content: flex-end;
		background: var(--btn-primary-hover);
		width: auto;
		min-width: 140px;
		height: 40px;
		padding: 0 1rem;
		gap: 0.5rem;
		border-radius: 10px;
	}

	.add-movie-cta:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}

	.add-movie-cta-icon {
		display: inline-flex;
		flex-shrink: 0;
		transition: transform 0.3s ease;
	}

	.add-movie-cta:hover .add-movie-cta-icon {
		transform: rotate(90deg);
	}

	.add-movie-cta-text {
		display: inline-block;
		white-space: nowrap;
		max-width: 0;
		overflow: hidden;
		opacity: 0;
		margin-right: 0;
		transition: max-width 0.3s ease, opacity 0.25s ease, margin-right 0.25s ease;
	}

	.add-movie-cta:hover .add-movie-cta-text {
		max-width: 10em;
		opacity: 1;
		margin-right: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.add-movie-cta,
		.add-movie-cta-icon,
		.add-movie-cta-text {
			transition: none;
		}
		.add-movie-cta:hover .add-movie-cta-icon {
			transform: none;
		}
	}

	/* Add movie overlay – uses shared --modal-* palette */
	.add-overlay-backdrop {
		position: fixed;
		inset: 0;
		background: var(--modal-backdrop);
		z-index: 200;
		backdrop-filter: blur(6px);
	}

	.add-overlay-panel {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 420px;
		padding: 1.5rem;
		background: var(--modal-bg);
		border: 1px solid var(--modal-border);
		border-radius: 12px;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
		z-index: 201;
	}

	.add-overlay-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.add-overlay-input {
		width: 100%;
		height: 44px;
		margin: 0;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		line-height: 1;
		color: var(--modal-text);
		background: var(--modal-input-bg);
		border: 1px solid var(--modal-input-border);
		border-radius: 10px;
		box-sizing: border-box;
		-webkit-appearance: none;
		appearance: none;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.add-overlay-input::placeholder {
		color: var(--modal-text-muted);
	}

	.add-overlay-input:hover {
		border-color: #2e2e3a;
	}

	.add-overlay-input:focus {
		outline: none;
		border-color: var(--modal-focus-border);
		box-shadow: 0 0 0 2px var(--modal-focus-ring);
	}

	.add-overlay-hint {
		margin: 0;
		font-size: 0.875rem;
		color: var(--modal-text-muted);
	}

	.add-overlay-error {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--modal-error);
		padding: 0.25rem 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.logo {
		font-size: 1.375rem;
		font-weight: 600;
		color: #fff;
		text-decoration: none;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow:
			0 0 4px #fff,
			0 0 8px var(--neon-blue),
			0 0 12px var(--neon-blue),
			0 0 24px var(--neon-blue),
			0 0 48px var(--neon-blue);
		transition: text-shadow 0.2s ease, filter 0.2s ease;
		animation: neon-flicker 4s ease-in-out infinite;
	}

	.logo:hover {
		text-decoration: none;
		text-shadow:
			0 0 6px #fff,
			0 0 12px var(--neon-blue),
			0 0 18px var(--neon-blue),
			0 0 32px var(--neon-blue),
			0 0 64px var(--neon-blue);
		filter: brightness(1.15);
	}

	@keyframes neon-flicker {
		0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
			opacity: 1;
		}
		20%, 24%, 55% {
			opacity: 0.92;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.logo {
			animation: none;
		}
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

	/* Avatar trigger: no outline, just the avatar */
	.user-menu-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0;
		font-family: inherit;
		color: var(--text);
		background: transparent;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.2s ease;
		box-sizing: border-box;
	}

	.user-menu-trigger:hover {
		background: transparent;
	}

	.user-menu-trigger:focus-visible {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}

	.user-menu-trigger[aria-expanded='true'] {
		background: transparent;
	}

	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 1px solid var(--border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}
	.user-avatar-initials {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: linear-gradient(145deg, var(--input-bg) 0%, var(--border) 100%);
		color: var(--text);
		font-size: 0.8125rem;
		font-weight: 600;
		flex-shrink: 0;
		border: 1px solid var(--border);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 1px 3px rgba(0, 0, 0, 0.2);
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0 1rem;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		color: var(--text);
		text-decoration: none;
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
		box-sizing: border-box;
	}

	.login-link:hover {
		background: var(--input-bg);
		border-color: var(--input-border);
		color: var(--text);
		text-decoration: none;
	}

	.login-link:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}

	/* Login modal (top-right Log in button) */
	.login-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: var(--modal-backdrop);
		backdrop-filter: blur(6px);
		animation: fade-in 0.2s ease-out;
	}

	.login-modal-panel {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 90%;
		max-width: 400px;
		padding: 1.5rem 2rem;
		background: var(--modal-bg);
		border: 1px solid var(--modal-border);
		border-radius: 16px;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
		z-index: 201;
		animation: fade-in 0.25s ease-out;
	}

	.login-modal-title {
		margin: 0 0 1.25rem;
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--modal-text);
		text-align: center;
	}

	.login-modal-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.login-modal-label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.login-modal-label-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text);
	}

	.login-modal-input {
		width: 100%;
		height: 44px;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		font-family: inherit;
		color: var(--text);
		background: var(--modal-input-bg);
		border: 1px solid var(--modal-input-border);
		border-radius: 10px;
		box-sizing: border-box;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.login-modal-input:focus {
		outline: none;
		border-color: var(--modal-focus-border);
		box-shadow: 0 0 0 2px var(--modal-focus-ring);
	}

	.login-modal-btn {
		width: 100%;
		height: 44px;
		margin-top: 0.25rem;
		padding: 0 1rem;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		border: 1px solid var(--modal-border);
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.2s ease, opacity 0.2s ease;
		box-sizing: border-box;
	}

	.login-modal-btn:hover:not(:disabled) {
		background: var(--btn-primary-hover);
	}

	.login-modal-btn:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}

	.login-modal-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.login-modal-error {
		margin: 0;
		font-size: 0.875rem;
		color: var(--modal-error);
	}

	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
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
		color: var(--btn-primary-text);
		border: 1px solid var(--border);
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease, opacity 0.2s ease;
	}

	:global(button:hover) {
		background: var(--btn-primary-hover);
	}

	:global(button:focus-visible) {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}

	:global(.form-error) {
		font-size: 0.875rem;
		color: var(--error);
		margin: 0.5rem 0 0;
	}
</style>
