<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
import Clapperboard from '$lib/components/icons/Clapperboard.svelte';
import LogOut from '$lib/components/icons/LogOut.svelte';
import Plus from '$lib/components/icons/Plus.svelte';
	import { addFormMessage } from '$lib/stores/addForm';
	import { showAuthLoadingScreen } from '$lib/stores/authLoading';
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
	let addFormRef: HTMLFormElement;
	let addSearchQuery = $state('');
	let addSearchResults = $state<Array<{ id: number; title: string; poster_path: string | null; year: string | null; overview: string | null; genre: string | null }>>([]);
	let addSearchLoading = $state(false);
	let addSearchDebounce: ReturnType<typeof setTimeout> | null = null;
	const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w92';
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
		addSearchQuery = '';
		addSearchResults = [];
		if (addSearchDebounce) {
			clearTimeout(addSearchDebounce);
			addSearchDebounce = null;
		}
		const t = setTimeout(() => {
			addOverlayInput?.focus();
		}, 50);
		document.addEventListener('keydown', handleAddOverlayKeydown, true);
		return () => {
			clearTimeout(t);
			document.removeEventListener('keydown', handleAddOverlayKeydown, true);
		};
	});

	$effect(() => {
		if (!$showAuthLoadingScreen) return;
		const t = setTimeout(async () => {
			await invalidateAll();
			showAuthLoadingScreen.set(false);
		}, 2500);
		return () => clearTimeout(t);
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
		addSearchQuery = '';
		addSearchResults = [];
		if (addSearchDebounce) {
			clearTimeout(addSearchDebounce);
			addSearchDebounce = null;
		}
		requestAnimationFrame(() => addOverlayPreviousFocus?.focus());
	}

	async function fetchSearchResults(q: string) {
		if (q.trim().length < 2) {
			addSearchResults = [];
			return;
		}
		addSearchLoading = true;
		try {
			const res = await fetch(`/api/search-movies?q=${encodeURIComponent(q.trim())}`);
			const data = await res.json();
			addSearchResults = Array.isArray(data) ? data : [];
		} catch {
			addSearchResults = [];
		} finally {
			addSearchLoading = false;
		}
	}

	function onAddSearchInput() {
		addFormMessage.set(null);
		const value = addOverlayInput?.value ?? '';
		addSearchQuery = value;
		if (addSearchDebounce) clearTimeout(addSearchDebounce);
		addSearchDebounce = setTimeout(() => {
			addSearchDebounce = null;
			fetchSearchResults(value);
		}, 300);
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
	{#if $showAuthLoadingScreen}
		<div class="auth-loading-screen" transition:fade={{ duration: 200 }}>
			<div class="auth-loading-scanlines" aria-hidden="true"></div>
			<div class="auth-loading-grain" aria-hidden="true"></div>
			<div class="auth-loading-inner">
				<span class="auth-loading-title">Kinoline</span>
				<div class="auth-loading-dots" aria-hidden="true">
					<span></span><span></span><span></span>
				</div>
			</div>
		</div>
	{/if}
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
						<Plus size={16} />
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
							<a href="/stats" class="user-menu-item user-menu-link" role="menuitem">
								<Clapperboard size={20} />
								Stats
							</a>
							<div class="user-menu-sep" role="separator"></div>
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
			<button type="button" class="login-link" onclick={() => { loginModalOpen = true; loginModalError = null; }}>Sign in</button>
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
			aria-label="Sign in"
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
							showAuthLoadingScreen.set(true);
							/* Movies and layout data load after overlay ends (see $effect) */
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
					{loginModalSubmitting ? 'Signing in…' : 'Sign in'}
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
				bind:this={addFormRef}
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
							addSearchResults = [];
							// Invalidate first so load functions refetch; then update so UI shows new data
							await invalidateAll();
							await update();
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
					aria-label="Movie title"
					autocomplete="off"
					class="add-overlay-input"
					bind:this={addOverlayInput}
					bind:value={addSearchQuery}
					oninput={onAddSearchInput}
					disabled={addFormSubmitting}
				/>
				<p id="add-movie-hint" class="add-overlay-hint">
					Search and pick a movie from the list, or press Enter to add the first match.
				</p>
				<div class="add-overlay-results-slot">
					{#if addSearchLoading}
						<p class="add-overlay-hint" aria-live="polite">Searching…</p>
					{:else if addSearchQuery.trim().length >= 2 && addSearchResults.length === 0 && !addSearchLoading}
						<p class="add-overlay-hint">No movies found. Try another title or press Enter to add by name.</p>
					{:else if addSearchResults.length > 0}
						<ul
							class="add-overlay-results"
							role="list"
							aria-label="Search results"
							in:fly={{ y: 8, duration: 220, easing: (t) => t * (2 - t) }}
							out:fly={{ y: 8, duration: 140, easing: (t) => t * t }}
						>
							{#each addSearchResults as movie (movie.id)}
								<li>
									<button
										type="submit"
										name="tmdbId"
										value={movie.id}
										class="add-overlay-result-btn"
										disabled={addFormSubmitting}
									>
										<span class="add-overlay-result-poster">
											{#if movie.poster_path}
												<img src="{TMDB_POSTER_BASE}{movie.poster_path}" alt="" width="46" height="69" />
											{:else}
												<span class="add-overlay-result-poster-placeholder">{movie.title.slice(0, 2)}</span>
											{/if}
										</span>
										<span class="add-overlay-result-info">
											<span class="add-overlay-result-title">{movie.title}</span>
											{#if movie.year || movie.genre}
												<span class="add-overlay-result-meta">{[movie.year, movie.genre].filter(Boolean).join(' · ')}</span>
											{/if}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
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
	/* ==========================================================================
	   LAYOUT STYLES — Index
	   1. Global reset & base (html, body)
	   2. CSS custom properties (theme)
	   3. App shell & desktop layout
	   4. Auth loading overlay (Kinoline screen)
	   5. VHS overlay (grain)
	   6. Header (brand, logo, tagline)
	   7. Add movie CTA & overlay
	   8. User menu (avatar, dropdown, login link)
	   9. Login (sign-in) modal
	   10. Main & global typography / form defaults
	   ========================================================================== */

	/* --------------------------------------------------------------------------
	   1. Global reset & base
	   -------------------------------------------------------------------------- */
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
		color-scheme: dark;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
	}

	/* --------------------------------------------------------------------------
	   2. CSS custom properties — Color palette
	   --------------------------------------------------------------------------
	   Base .............. Page and default text
	   Surfaces .......... Cards, inputs, panels
	   Text .............. Primary, muted, links
	   Borders ........... Dividers, input borders
	   Buttons & links .... CTAs, focus
	   Feedback .......... Error, success (watched badge)
	   Modals ............. Overlays and dialogs (alias where same as base)
	   Overlays ........... Backdrops, hovers, VHS screen
	   Special ............ Neon (logo), rating star, filter badge
	   -------------------------------------------------------------------------- */
	:global(html) {
		/* Base */
		--bg: #0c0c0f;
		--text: #e8e8f0;
		--text-muted: #9090a0;
		--white: #fff;

		/* Surfaces */
		--card-bg: #12121a;
		--input-bg: #12121a;
		--input-border: #2a2a3a;
		--input-border-hover: #2e2e3a;
		--border: #252538;
		--poster-bg: #1a1a22;

		/* Text (aliases for clarity) */
		--card-accent: var(--text);
		--card-accent-muted: var(--text-muted);
		--poster-text: var(--text-muted);

		/* Buttons & links */
		--link: #a8a8c0;
		--btn-primary-bg: #a0a0b0;
		--btn-primary-hover: #b0b0c0;
		--btn-primary-text: #0f0f14;
		--btn-primary-focus: #0f0f14;
		--focus-ring: rgba(200, 200, 210, 0.35);

		/* Feedback */
		--error: #f87171;
		--watched-badge-bg: #0d2e0d;
		--watched-badge-text: #6ee76e;
		--watched-badge-border: #1a4d1a;

		/* Modals (surfaces + aliases) */
		--modal-bg: var(--card-bg);
		--modal-border: var(--border);
		--modal-backdrop: rgba(8, 8, 12, 0.85);
		--modal-text: var(--text);
		--modal-text-muted: var(--text-muted);
		--modal-input-bg: #16161d;
		--modal-input-border: #252530;
		--modal-focus-border: #5a5a6a;
		--modal-focus-ring: rgba(90, 90, 106, 0.25);
		--modal-error: var(--error);

		/* Float menu / dropdowns */
		--float-menu-bg: rgba(18, 18, 24, 0.92);
		--float-menu-border: rgba(255, 255, 255, 0.08);
		--float-menu-input-bg: rgba(255, 255, 255, 0.06);
		--float-menu-input-border: rgba(255, 255, 255, 0.12);
		--float-menu-btn-bg: #3a3a4a;
		--float-menu-btn-border: #4a4a5a;
		--float-menu-btn-text: var(--white);
		--float-menu-btn-hover: #4a4a5a;
		--float-menu-text: var(--text);
		--float-menu-muted: rgba(232, 232, 240, 0.5);
		--float-menu-error: var(--error);

		/* Overlays & one-off surfaces */
		--vhs-screen-blue: rgba(0, 0, 204, 0.78);
		--overlay-mask: rgba(0, 0, 0, 0.78);
		--backdrop-dark: rgba(0, 0, 0, 0.35);
		--surface-hover: rgba(255, 255, 255, 0.08);
		--surface-hover-strong: rgba(255, 255, 255, 0.1);
		--surface-overlay-light: rgba(255, 255, 255, 0.06);
		--surface-selected: rgba(255, 255, 255, 0.15);
		--vhs-blue: #3a3a4a;

		/* Special */
		--neon-blue: #5c7cff;
		--rating-star: #eab308;
		--badge-bg: rgba(0, 0, 0, 0.32);
		--badge-text: rgba(255, 255, 255, 0.95);
		--badge-border: rgba(255, 255, 255, 0.1);
	}

	/* --------------------------------------------------------------------------
	   3. App shell & desktop layout
	   -------------------------------------------------------------------------- */
	.app {
		width: 100%;
		min-height: 100vh;
		--page-padding-x: 1.5rem;
		padding: 0 1.5rem 2rem;
		box-sizing: border-box;
		position: relative;
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

	/* --------------------------------------------------------------------------
	   4. Auth loading overlay (Kinoline screen after sign in/up)
	   -------------------------------------------------------------------------- */
	.auth-loading-screen {
		position: fixed;
		inset: 0;
		z-index: 10002;
		background: var(--vhs-screen-blue);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		animation: auth-loading-in 0.55s ease-out;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	@keyframes auth-loading-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@media (prefers-reduced-motion: reduce) {
		.auth-loading-screen { animation: none; }
	}
	.auth-loading-scanlines {
		position: absolute;
		inset: 0;
		background-image: repeating-linear-gradient(
			0deg,
			transparent 0px,
			transparent 2px,
			rgba(0, 0, 0, 0.05) 2px,
			rgba(0, 0, 0, 0.05) 4px
		);
		pointer-events: none;
	}
	.auth-loading-grain {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
		opacity: 0.04;
		mix-blend-mode: overlay;
		pointer-events: none;
	}
	.auth-loading-inner {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		font-family: 'VT323', monospace;
		pointer-events: none;
	}
	.auth-loading-title {
		font-size: clamp(1.75rem, 5vw, 3rem);
		font-weight: 600;
		color: var(--white);
		letter-spacing: 0.1em;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
	}
	.auth-loading-dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
	}
	.auth-loading-dots span {
		width: 0.4em;
		height: 0.4em;
		border-radius: 50%;
		background: var(--badge-text);
		animation: auth-loading-bullet 1.2s ease-in-out infinite both;
	}
	.auth-loading-dots span:nth-child(1) { animation-delay: 0s; }
	.auth-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
	.auth-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes auth-loading-bullet {
		0%, 80%, 100% { opacity: 0.35; transform: scale(0.85); }
		40% { opacity: 1; transform: scale(1); }
	}

	/* --------------------------------------------------------------------------
	   5. VHS overlay (grain; scanlines live on posters in +page)
	   -------------------------------------------------------------------------- */
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

	/* --------------------------------------------------------------------------
	   6. Header (brand, logo, tagline)
	   -------------------------------------------------------------------------- */
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
		gap: 16px;
	}

	/* --------------------------------------------------------------------------
	   7. Add movie CTA & overlay
	   -------------------------------------------------------------------------- */
	.add-movie-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: auto;
		margin: 0;
		padding: 0.35em 0.6em;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1;
		font-family: inherit;
		border: none;
		border-radius: 6px;
		background: none;
		color: var(--text);
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;
	}
	.add-movie-cta:hover {
		background-color: var(--surface-overlay-light);
		color: var(--link);
	}
	.add-movie-cta:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}
	.add-movie-cta-icon {
		display: inline-flex;
		flex-shrink: 0;
	}
	.add-movie-cta-text {
		white-space: nowrap;
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
		top: 24vh;
		left: 50%;
		transform: translateX(-50%);
		width: 90%;
		max-width: 420px;
		max-height: calc(80vh - 2rem);
		overflow: hidden;
		display: flex;
		flex-direction: column;
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
		min-height: 0;
		flex: 1;
		overflow: auto;
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
		border-color: var(--input-border-hover);
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

	.add-overlay-results-slot {
		min-height: 0;
	}

	.add-overlay-results {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 280px;
		overflow-y: auto;
		border: 1px solid var(--modal-input-border);
		border-radius: 10px;
		background: var(--modal-input-bg);
	}

	.add-overlay-result-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		margin: 0;
		padding: 0.5rem 0.75rem;
		text-align: left;
		font: inherit;
		color: var(--modal-text);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--modal-input-border);
		cursor: pointer;
		transition: background 0.15s ease;
	}
	.add-overlay-result-btn:last-child {
		border-bottom: none;
	}
	.add-overlay-result-btn:hover:not(:disabled) {
		background: var(--modal-input-hover, rgba(255, 255, 255, 0.06));
	}
	.add-overlay-result-btn:focus-visible {
		outline: none;
		background: var(--modal-focus-ring);
	}
	.add-overlay-result-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.add-overlay-result-poster {
		flex-shrink: 0;
		width: 46px;
		height: 69px;
		border-radius: 6px;
		overflow: hidden;
		background: var(--modal-input-border);
	}
	.add-overlay-result-poster img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.add-overlay-result-poster-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--modal-text-muted);
	}

	.add-overlay-result-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}
	.add-overlay-result-title {
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.add-overlay-result-meta {
		font-size: 0.8125rem;
		color: var(--modal-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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

	/* --------------------------------------------------------------------------
	   8. User menu (avatar, dropdown, items, login link)
	   -------------------------------------------------------------------------- */
	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.logo {
		font-size: 1.375rem;
		font-weight: 600;
		color: var(--white);
		text-decoration: none;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-shadow:
			0 0 4px var(--white),
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
			0 0 6px var(--white),
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
		background: var(--surface-hover);
	}

	.user-menu-trigger:hover .user-avatar,
	.user-menu-trigger:hover .user-avatar-initials {
		box-shadow:
			0 3px 10px rgba(0, 0, 0, 0.4),
			inset 0 0 0 2px rgba(0, 0, 0, 0.5);
	}

	.user-menu-trigger:focus-visible {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}

	.user-menu-trigger[aria-expanded='true'] {
		background: var(--surface-hover);
	}

	/* Avatar: sticker-style (dark mode) – inner outline + shadow */
	.user-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: none;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.35),
			inset 0 0 0 2px rgba(0, 0, 0, 0.5);
		transition: box-shadow 0.2s ease;
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
		border: none;
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.35),
			inset 0 0 0 2px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.06);
		transition: box-shadow 0.2s ease;
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
		background: var(--backdrop-dark);
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
		min-width: 220px;
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

	.user-menu-sep {
		height: 1px;
		background: var(--border);
		margin: 0.5rem 0;
	}

	.user-menu-item-form {
		margin: 0;
	}

	.user-menu-link {
		text-decoration: none;
		color: var(--text);
	}

	.user-menu-link:hover {
		text-decoration: none;
		color: var(--text);
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

	/* --------------------------------------------------------------------------
	   9. Login (sign-in) modal
	   -------------------------------------------------------------------------- */
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

	/* --------------------------------------------------------------------------
	   10. Main & global typography / form defaults
	   -------------------------------------------------------------------------- */
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
