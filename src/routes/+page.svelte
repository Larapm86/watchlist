<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Check from '$lib/components/icons/Check.svelte';
	import X from '$lib/components/icons/X.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let cinemaDropHighlight = $state(false);
	let dropForm: HTMLFormElement;
	let optimisticallyWatchedIds = $state<number[]>([]);
	let optimisticallyUnwatchedIds = $state<number[]>([]);
	let lastDroppedId = $state(0);
	let showMarkedToast = $state(false);
	let toastTimeout: ReturnType<typeof setTimeout>;

	// Per-card hover: 3D tilt/shift/shadow based on mouse position inside the hovered card only
	let hoveredCardIndex = $state<number | null>(null);
	let mouseInCardX = $state(0);
	let mouseInCardY = $state(0);
	let reduceMotion = $state(false);

	const TILT_MAX = 14;
	const SHIFT_MAX = 12;
	const LIFT_Y = -12; /* base lift when hovered */

	function getCardHoverStyle(x: number, y: number): string {
		const tx = x * (SHIFT_MAX / 100);
		const ty = LIFT_Y + y * (SHIFT_MAX / 100);
		const rotX = y * (TILT_MAX / 100);
		const rotY = -x * (TILT_MAX / 100);
		const shadowY = 32 + Math.abs(y) * 0.2;
		const shadowBlur = 56 + Math.abs(x + y) * 0.15;
		return `transform: translate(${tx}px, ${ty}px) rotateX(${rotX}deg) rotateY(${rotY}deg); box-shadow: 0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.28);`;
	}

	function handleCardMouseEnter(_e: MouseEvent, index: number) {
		hoveredCardIndex = index;
	}

	function handleCardMouseLeave() {
		hoveredCardIndex = null;
		mouseInCardX = 0;
		mouseInCardY = 0;
	}

	function handleCardMouseMove(e: MouseEvent, index: number) {
		if (hoveredCardIndex !== index || reduceMotion) return;
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
		const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
		mouseInCardX = Math.max(-1, Math.min(1, x)) * 100;
		mouseInCardY = Math.max(-1, Math.min(1, y)) * 100;
	}

	function showMarkedFeedback() {
		showMarkedToast = true;
		clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			showMarkedToast = false;
		}, 2500);
	}

	function handleDragStart(e: DragEvent, id: number) {
		if (!e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', String(id));
		e.dataTransfer.effectAllowed = 'move';
	}

	const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
	function getPosterUrl(item: { posterPath?: string | null; poster_path?: string | null }): string | null {
		const raw = item.posterPath ?? item.poster_path;
		if (raw == null || String(raw).trim() === '') return null;
		const path = String(raw).trim();
		const normalized = path.startsWith('/') ? path : `/${path}`;
		return `${TMDB_IMAGE_BASE}${normalized}`;
	}

	function handleCinemaDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		cinemaDropHighlight = true;
	}

	function handleCinemaDragLeave() {
		cinemaDropHighlight = false;
	}

	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		const onChange = (e: MediaQueryListEvent) => {
			reduceMotion = e.matches;
		};
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	function handleCinemaDrop(e: DragEvent) {
		e.preventDefault();
		cinemaDropHighlight = false;
		const idStr = e.dataTransfer?.getData('text/plain');
		if (!idStr || !dropForm) return;
		const id = parseInt(idStr, 10);
		if (Number.isNaN(id)) return;
		lastDroppedId = id;
		optimisticallyWatchedIds = [...optimisticallyWatchedIds, id];
		showMarkedFeedback();
		const input = dropForm.querySelector<HTMLInputElement>('input[name="id"]');
		if (input) {
			input.value = idStr;
			dropForm.requestSubmit();
		}
	}
</script>

<div class="page">
	{#if showMarkedToast}
		<div class="toast" role="status" aria-live="polite">
			<Check size={18} />
			Marked as watched
		</div>
	{/if}

	<!-- Poster strip: each poster = same hero shape + behavior (tilt, shadow) -->
	<div class="poster-strip-wrap">
		<div class="poster-strip-inner">
			{#if data.watchlist.length === 0}
				<p class="empty">No movies yet. Add one from the search bar above.</p>
			{:else}
				<ul class="poster-grid">
					{#each data.watchlist as item, i}
						{@const isWatched =
							(!!item.watchedAt || optimisticallyWatchedIds.includes(item.id)) &&
							!optimisticallyUnwatchedIds.includes(item.id)}
						{@const posterUrl = getPosterUrl(item)}
						<li
							class="poster-card hero-poster"
							class:watched={isWatched}
							class:to-watch={!isWatched}
							draggable={!isWatched}
							ondragstart={(e) => handleDragStart(e, item.id)}
							onmouseenter={(e) => handleCardMouseEnter(e, i)}
							onmouseleave={handleCardMouseLeave}
							onmousemove={(e) => handleCardMouseMove(e, i)}
							style="animation-delay: {i * 0.06}s; {hoveredCardIndex === i && !reduceMotion ? getCardHoverStyle(mouseInCardX, mouseInCardY) : ''}"
						>
							<div class="vhs-case">
								<div class="vhs-spine" aria-hidden="true"></div>
								<div class="vhs-face">
							<div class="poster" class:watched={isWatched}>
								{#if isWatched}
									<div class="poster-watched-badge" aria-label="Watched">
										<Check size={18} />
									</div>
								{/if}
								{#if posterUrl}
									<img
										class="poster-image"
										src={posterUrl}
										alt={item.title}
										referrerpolicy="no-referrer"
										onerror={(e) => {
											const el = e.currentTarget;
											const placeholder = el?.nextElementSibling as HTMLElement | null;
											if (el && placeholder) {
												el.hidden = true;
												placeholder.hidden = false;
											}
										}}
									/>
									<div class="poster-placeholder" aria-hidden="true" hidden></div>
								{:else}
									<div class="poster-placeholder" aria-hidden="true"></div>
								{/if}
								<div class="poster-title-overlay">
									<span class="poster-title-text">{item.title}</span>
								</div>
								<div class="poster-overlay">
									<div class="overlay-description-wrap">
										{#if item.overview}
											<p class="overlay-description">{item.overview}</p>
										{:else}
											<p class="overlay-description overlay-description-fallback">{item.title}</p>
										{/if}
									</div>
									<div class="overlay-actions">
										{#if isWatched}
											<form method="post" action="?/unmarkWatched" use:enhance={({ formData }) => {
												const idVal = formData.get('id');
												const id = typeof idVal === 'string' ? parseInt(idVal, 10) : Number(idVal);
												if (!Number.isNaN(id) && id > 0) optimisticallyUnwatchedIds = [...optimisticallyUnwatchedIds, id];
												return async ({ update }) => {
													try { await update(); await invalidateAll(); } catch (_) {}
													optimisticallyUnwatchedIds = optimisticallyUnwatchedIds.filter((x) => x !== id);
												};
											}} class="overlay-form">
												<input type="hidden" name="id" value={item.id} />
												<button type="submit" class="overlay-btn overlay-btn-unmark" title="Mark as to watch again">
													<Check size={22} />
												</button>
											</form>
										{/if}
										<form method="post" action="?/delete" use:enhance class="overlay-form">
											<input type="hidden" name="id" value={item.id} />
											<button type="submit" class="overlay-btn overlay-btn-remove" title="Remove this movie from your watchlist">
												<X size={22} />
											</button>
										</form>
									</div>
								</div>
							</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<!-- Drop zone: floating VHS player, bottom-right corner -->
	<section
		class="vhs-drop"
		class:drop-active={cinemaDropHighlight}
		ondragover={handleCinemaDragOver}
		ondragleave={handleCinemaDragLeave}
		ondrop={handleCinemaDrop}
		role="region"
		aria-label="Drop movies here to mark as watched"
	>
		<form
			method="post"
			action="?/markWatched"
			use:enhance={() => {
				return async ({ update }) => {
					try {
						await update();
						await invalidateAll();
					} catch (_) {}
					if (lastDroppedId) {
						optimisticallyWatchedIds = optimisticallyWatchedIds.filter((x) => x !== lastDroppedId);
						lastDroppedId = 0;
					}
				};
			}}
			bind:this={dropForm}
			class="drop-form"
			aria-hidden="true"
		>
			<input type="hidden" name="id" value="" />
		</form>
		<div class="vhs-player" aria-hidden="true">
			<svg viewBox="0 0 140 88" fill="none" xmlns="http://www.w3.org/2000/svg">
				<defs>
					<linearGradient id="vhsBody" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="#3f3f46" />
						<stop offset="30%" stop-color="#27272a" />
						<stop offset="100%" stop-color="#18181b" />
					</linearGradient>
					<linearGradient id="vhsSlot" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="#0a0a0b" />
						<stop offset="100%" stop-color="#1f1f23" />
					</linearGradient>
					<filter id="vhsShadow" x="-15%" y="-10%" width="130%" height="125%">
						<feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.35" />
					</filter>
					<!-- Chroma-style fringing for OSD text (old VCR display look) -->
					<filter id="vhsChromaText" x="-30%" y="-30%" width="160%" height="160%">
						<feDropShadow dx="0.4" dy="0" stdDeviation="0.5" flood-color="#0000CC" flood-opacity="0.45"/>
						<feDropShadow dx="0" dy="0" stdDeviation="0" flood-color="#e8e8e8"/>
					</filter>
				</defs>
				<!-- Main body -->
				<rect x="8" y="4" width="124" height="80" rx="6" fill="url(#vhsBody)" filter="url(#vhsShadow)" />
				<!-- Bevel / top edge highlight -->
				<path d="M8 10 L132 10 L124 4 L16 4 Z" fill="#52525b" opacity="0.6" />
				<!-- Tape slot (drop target area) -->
				<rect x="28" y="14" width="84" height="36" rx="3" fill="url(#vhsSlot)" stroke="#3f3f46" stroke-width="1.5" />
				<rect x="32" y="18" width="76" height="28" rx="2" fill="#0d0d0f" />
				<!-- Slot label (pixel/OSD style) -->
				<text x="70" y="36" text-anchor="middle" fill="#e8e8e8" font-size="16" font-family="VT323, monospace" filter="url(#vhsChromaText)">DROP</text>
				<!-- Buttons row -->
				<rect x="24" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<rect x="40" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<rect x="56" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<rect x="72" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<rect x="88" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<rect x="104" y="56" width="12" height="10" rx="2" fill="#27272a" stroke="#52525b" stroke-width="0.8" />
				<!-- Play triangle on middle button -->
				<path d="M62 60 L62 66 L68 63 Z" fill="#71717a" />
				<!-- Digital display -->
				<rect x="24" y="72" width="92" height="8" rx="2" fill="#0a0a0b" stroke="#3f3f46" stroke-width="0.8" />
				<text x="70" y="78" text-anchor="middle" fill="#22c55e" font-size="7" font-family="VT323, monospace">0:00:00</text>
				<!-- Power / record LED -->
				<circle cx="124" cy="72" r="3" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
				<circle cx="124" cy="72" r="1.5" fill="#22c55e" opacity="0.9" />
			</svg>
		</div>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
		min-height: 100vh;
	}

	/* Poster strip: each poster = same hero shape + behavior */
	.poster-strip-wrap {
		position: relative;
		margin-left: calc(-1 * var(--page-padding-x));
		margin-right: calc(-1 * var(--page-padding-x));
		padding: 0 var(--page-padding-x) 2rem;
		perspective: 1200px;
		transform-style: preserve-3d;
		overflow: visible; /* don't clip hover animation on cards */
	}
	.poster-strip-inner {
		overflow: visible;
	}
	.poster-strip-wrap .empty {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-muted);
	}

	/* Each poster card = hero shape; hovered card gets 3D tilt/shift/shadow from JS (per-card) */
	.poster-card.hero-poster {
		border-radius: 24px;
		box-shadow: 0 24px 40px rgba(0, 0, 0, 0.12);
		animation: hero-poster-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
		transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
		transform-style: preserve-3d;
	}
	@keyframes hero-poster-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	/* Only opacity animated so hover transform is never overridden by animation */

	@media (prefers-reduced-motion: reduce) {
		.poster-card.hero-poster {
			animation: none;
		}
		.poster-card.hero-poster:hover {
			transform: none;
		}
	}

	/* VHS player drop zone: floating bottom-right corner */
	.vhs-drop {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 40;
		width: 260px;
		height: 132px;
		display: flex;
		align-items: flex-end;
		justify-content: flex-end;
		cursor: default;
		transition: transform 0.2s ease, filter 0.2s ease;
	}
	.vhs-drop.drop-active {
		transform: scale(1.08);
		filter: brightness(1.2) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.3));
	}
	.vhs-drop .drop-form {
		position: absolute;
		inset: -12px;
		opacity: 0;
		pointer-events: none;
	}
	.vhs-drop .drop-form:focus-within {
		pointer-events: auto;
	}
	.vhs-player {
		width: 252px;
		height: 105px;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}
	.vhs-player svg {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.toast {
		position: fixed;
		bottom: 1.75rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.25rem;
		background: var(--watched-badge-bg);
		color: var(--watched-badge-text);
		border: 1px solid var(--watched-badge-border);
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
		z-index: 100;
		animation: toast-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(0.75rem);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	/* Horizontal scrolling strip: big posters (each = hero shape), no scrollbar */
	.poster-grid {
		display: flex;
		gap: 1.5rem;
		margin: 0;
		padding: 2rem 0 2rem; /* vertical room so hover lift/tilt isn't clipped */
		list-style: none;
		overflow-x: auto;
		overflow-y: visible; /* allow hover animation to extend above/below without clipping */
		scroll-snap-type: x mandatory;
		scroll-behavior: smooth;
		-webkit-overflow-scrolling: touch;
		perspective: 1200px;
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.poster-grid::-webkit-scrollbar {
		display: none;
	}

	.poster-grid > li {
		padding: 0;
		border-bottom: none;
		flex-shrink: 0;
		scroll-snap-align: start;
	}

	.poster-card {
		display: flex;
		flex-direction: column;
		cursor: default;
		border-radius: 0;
		overflow: visible;
		background: transparent;
		border: none;
		transition: transform 0.3s ease, box-shadow 0.3s ease;
		/* VHS case: spine + face; face 3:4 so height fits viewport */
		width: min(420px, 85vw, calc((100vh - 200px) * 3/4 + 14px));
		min-width: min(200px, 72vw, calc((100vh - 200px) * 3/4 * 0.5 + 14px));
	}

	/* VHS case: spine (left edge) + front face */
	.vhs-case {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		width: 100%;
		min-height: 0;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 2px 0 0 rgba(0, 0, 0, 0.15);
	}

	.vhs-spine {
		flex-shrink: 0;
		width: 14px;
		min-width: 14px;
		background: linear-gradient(90deg, #0d0d0d 0%, #1a1a1a 40%, #252525 100%);
		border-radius: 6px 0 0 6px;
		box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.4);
	}

	.vhs-face {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: #111;
		border: 3px solid #1a1a1a;
		border-left: none;
		border-radius: 0 6px 6px 0;
		overflow: hidden;
	}

	/* Non-hero cards (if any) keep card-in; hero posters use hero-poster-in only */
	.poster-card:not(.hero-poster) {
		animation: card-in 0.5s ease-out both;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateX(24px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.poster-card:not(.hero-poster):hover {
		transform: translateY(-2px);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
	}

	.poster-card[draggable='true'] {
		cursor: grab;
	}

	.poster-card[draggable='true']:active {
		cursor: grabbing;
	}

	.poster {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 4; /* VHS sleeve face */
		background: var(--poster-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 0;
		flex-shrink: 0;
		/* Inner frame like VHS sleeve window */
		border: 2px solid #1a1a1a;
		margin: 4px;
		box-sizing: border-box;
	}

	.poster.watched {
		opacity: 0.88;
	}

	.poster-watched-badge {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--watched-badge-bg);
		color: var(--watched-badge-text);
		border: 1px solid var(--watched-badge-border);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
	}

	.poster-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.78);
		opacity: 0;
		transition: opacity 0.25s ease;
		pointer-events: none;
	}

	@media (hover: hover) {
		.poster-card:hover .poster-overlay {
			opacity: 1;
			pointer-events: auto;
		}
	}

	.overlay-description-wrap {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		overflow: hidden;
	}

	.overlay-description {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.4;
		color: #fff;
		text-align: center;
		display: -webkit-box;
		-webkit-line-clamp: 5;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.overlay-description-fallback {
		-webkit-line-clamp: 2;
		opacity: 0.9;
	}

	.overlay-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.overlay-form {
		display: inline-flex;
	}

	.overlay-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		margin: 0;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.95);
		color: #1a1a1a;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease;
	}

	.overlay-btn:hover {
		transform: scale(1.1);
		background: #fff;
	}

	.overlay-btn-remove {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.5);
	}

	.overlay-btn-remove:hover {
		background: rgba(220, 53, 69, 0.9);
		color: #fff;
		border-color: transparent;
	}

	.overlay-btn-unmark {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		border: 1px solid rgba(255, 255, 255, 0.5);
	}

	.overlay-btn-unmark:hover {
		background: rgba(255, 255, 255, 0.35);
		color: #fff;
	}

	.poster-image {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.poster-title-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1;
		padding: 0.5rem 0.6rem 0.45rem;
		background: #0d0d0d;
		border-top: 2px solid #333;
		display: flex;
		align-items: center;
		/* VHS label strip at bottom of case */
		min-height: 2.5rem;
	}

	.poster-title-text {
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.25;
		color: #e5e5e5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.poster-placeholder {
		position: absolute;
		inset: 0;
		padding: 1.25rem 1rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.poster-title {
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.35;
		color: var(--poster-text);
		opacity: 0.7;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

</style>
