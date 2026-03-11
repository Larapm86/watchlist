<script lang="ts">
	import { onMount } from 'svelte';
	import { tick } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import X from '$lib/components/icons/X.svelte';
	import Landing from '$lib/components/landing/Landing.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let filterStatus = $state<'all' | 'to-watch' | 'watched'>('all');
	let filterGenre = $state<string>('all');
	let filtersOpen = $state(false);
	let statusDropdownOpen = $state(false);
	let genreDropdownOpen = $state(false);
	let filtersButtonEl: HTMLButtonElement;

	const list = $derived(data?.watchlist ?? []);
	const genresFromList = $derived(
		Array.from(
			new Set(
				list.flatMap((item) => {
					const g = item.genre?.trim();
					if (!g) return [];
					return g.split(/\s*,\s*/).filter(Boolean);
				})
			)
		).sort((a, b) => a.localeCompare(b))
	);
	const filteredWatchlist = $derived(
		list.filter((item) => {
			const isWatched = !!item.watchedAt || optimisticallyWatchedIds.includes(item.id);
			if (filterStatus === 'watched' && !isWatched) return false;
			if (filterStatus === 'to-watch' && isWatched) return false;
			if (filterGenre !== 'all') {
				const g = item.genre?.trim() ?? '';
				const genres = g ? g.split(/\s*,\s*/).map((s) => s.trim()) : [];
				if (!genres.includes(filterGenre)) return false;
			}
			return true;
		})
	);
	const hasActiveFilters = $derived(filterStatus !== 'all' || filterGenre !== 'all');
	const activeFiltersCount = $derived(
		(filterStatus !== 'all' ? 1 : 0) + (filterGenre !== 'all' ? 1 : 0)
	);
	const statusLabel = $derived(
		filterStatus === 'all' ? 'All' : filterStatus === 'to-watch' ? 'Watchlist' : 'Watched'
	);
	const genreLabel = $derived(filterGenre === 'all' ? 'All' : filterGenre);

	let cinemaDropHighlight = $state(false);
	let dropForm: HTMLFormElement;
	let optimisticallyWatchedIds = $state<number[]>([]);
	let lastDroppedId = $state(0);
	let showDropTransition = $state(false);
	let dropTransitionCountdown = $state(1.5);
	let dropTransitionTimeout: ReturnType<typeof setTimeout>;
	let dropCountdownInterval: ReturnType<typeof setInterval>;
	let stickerRevealedForDrop = $state(false);
	let stickerRevealTimeout: ReturnType<typeof setTimeout>;
	let showRatingModal = $state(false);
	let starHover = $state(0);
	let ratingModalEl: HTMLDivElement;

	function getRatingModalFocusables(): HTMLElement[] {
		if (!ratingModalEl) return [];
		return Array.from(
			ratingModalEl.querySelectorAll<HTMLElement>(
				'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => el.tabIndex !== -1);
	}

	function closeRatingModal() {
		showRatingModal = false;
		lastDroppedId = 0;
		starHover = 0;
	}

	function handleRatingModalKeydown(e: KeyboardEvent) {
		if (!showRatingModal) return;
		if (e.key === 'Escape') {
			closeRatingModal();
			e.preventDefault();
			return;
		}
		if (e.key !== 'Tab') return;
		const focusables = getRatingModalFocusables();
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
		if (!showRatingModal) return;
		tick().then(() => {
			const focusables = getRatingModalFocusables();
			focusables[0]?.focus();
		});
		document.addEventListener('keydown', handleRatingModalKeydown, true);
		return () => document.removeEventListener('keydown', handleRatingModalKeydown, true);
	});

	function formatDropTime(seconds: number): string {
		const s = Math.max(0, seconds);
		const mins = Math.floor(s / 60);
		const secs = (s % 60).toFixed(1);
		return `0:${String(mins).padStart(2, '0')}:${secs.padStart(4, '0')}`;
	}

	// Per-card hover: 3D tilt/shift/shadow based on mouse position inside the hovered card only
	let hoveredCardIndex = $state<number | null>(null);
	let mouseInCardX = $state(0);
	let mouseInCardY = $state(0);
	let reduceMotion = $state(false);

	const TILT_MAX = 18;
	const SHIFT_MAX = 14;
	const LIFT_Y = -16; /* base lift when hovered */

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

	/** Creates a small VHS cassette canvas for the drag image */
	function createVhsDragImage(): HTMLCanvasElement {
		const scale = 2;
		const w = 56 * scale;
		const h = 36 * scale;
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) return canvas;

		const r = (n: number) => n * scale;
		// Body (rounded rect)
		ctx.fillStyle = '#27272a';
		roundRect(ctx, 0, 0, r(56), r(36), r(4));
		ctx.fill();
		// Top edge highlight
		ctx.fillStyle = '#3f3f46';
		ctx.beginPath();
		ctx.moveTo(r(4), r(2));
		ctx.lineTo(r(52), r(2));
		ctx.lineTo(r(54), 0);
		ctx.lineTo(r(2), 0);
		ctx.closePath();
		ctx.fill();
		// Tape window (dark slot)
		ctx.fillStyle = '#18181b';
		roundRect(ctx, r(8), r(8), r(40), r(20), r(2));
		ctx.fill();
		ctx.strokeStyle = '#3f3f46';
		ctx.lineWidth = 1;
		ctx.stroke();
		// Inner window (film area)
		ctx.fillStyle = '#0d0d0f';
		roundRect(ctx, r(10), r(10), r(36), r(16), r(1));
		ctx.fill();
		// Reel circles
		ctx.fillStyle = '#27272a';
		ctx.strokeStyle = '#52525b';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(r(18), r(18), r(4), 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(r(38), r(18), r(4), 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();

		return canvas;
	}

	function roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	) {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}

	function handleDragStart(e: DragEvent, id: number) {
		if (!e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', String(id));
		e.dataTransfer.effectAllowed = 'move';
		const canvas = createVhsDragImage();
		canvas.style.position = 'fixed';
		canvas.style.left = '-9999px';
		canvas.style.top = '0';
		document.body.appendChild(canvas);
		const scale = 2;
		e.dataTransfer.setDragImage(canvas, (56 * scale) / 2, (36 * scale) / 2);
		setTimeout(() => canvas.remove(), 0);
	}

	const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
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

	/** Action: block vertical wheel on horizontal scroll area so trackpad vertical doesn't move posters */
	function blockVerticalWheelOnHorizontalScroll(node: HTMLElement) {
		function onWheel(e: WheelEvent) {
			const dy = Math.abs(e.deltaY);
			const dx = Math.abs(e.deltaX);
			if (dy > dx) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
		node.addEventListener('wheel', onWheel, { passive: false, capture: true });
		return {
			destroy() {
				node.removeEventListener('wheel', onWheel, { capture: true });
			}
		};
	}

	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		const onChange = (e: MediaQueryListEvent) => {
			reduceMotion = e.matches;
		};
		mql.addEventListener('change', onChange);
		return () => {
			mql.removeEventListener('change', onChange);
			clearTimeout(dropTransitionTimeout);
			clearTimeout(stickerRevealTimeout);
		};
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
		stickerRevealedForDrop = false;
		dropTransitionCountdown = 1.5;
		showDropTransition = true;
		clearTimeout(dropTransitionTimeout);
		clearInterval(dropCountdownInterval);
		clearTimeout(stickerRevealTimeout);
		dropCountdownInterval = setInterval(() => {
			dropTransitionCountdown = Math.max(0, dropTransitionCountdown - 0.05);
		}, 50);
		dropTransitionTimeout = setTimeout(() => {
			clearInterval(dropCountdownInterval);
			showDropTransition = false;
			showRatingModal = true;
		}, 1500);
		stickerRevealTimeout = setTimeout(() => {
			stickerRevealedForDrop = true;
		}, 1500 + 500 + 500); /* transition end + 0.5s delay then show sticker */
		const input = dropForm.querySelector<HTMLInputElement>('input[name="id"]');
		if (input) {
			input.value = idStr;
			dropForm.requestSubmit();
		}
	}
</script>

{#if data?.user}
	<div class="page" transition:fade={{ duration: 320 }}>
	{#if showDropTransition}
		<div class="drop-vhs-screen" role="presentation" aria-hidden="true" transition:fade={{ duration: 500 }}>
			<div class="drop-vhs-screen-inner">
				<span class="drop-vhs-play">Watched</span>
				<span class="drop-vhs-time">{formatDropTime(dropTransitionCountdown)}</span>
			</div>
			<div class="drop-vhs-scanlines"></div>
			<div class="drop-vhs-grain"></div>
		</div>
	{/if}

	{#if showRatingModal && lastDroppedId}
		{@const ratingMovie = (data.watchlist ?? []).find((w) => w.id === lastDroppedId)}
		{@const starCopy = starHover <= 0 ? 'How was it? Tap a star to rate.' : starHover <= 2 ? 'Not for me — didn\'t love it.' : starHover === 3 ? 'It was okay — middle of the road.' : 'Loved it! — really enjoyed this one.'}
		<div
			class="rating-modal-backdrop"
			aria-hidden="false"
			onclick={closeRatingModal}
		>
			<div
				class="rating-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="rating-modal-title"
				aria-describedby="rating-modal-copy"
				bind:this={ratingModalEl}
				onclick={(e) => e.stopPropagation()}
			>
				<h2 id="rating-modal-title" class="rating-modal-title">Mark your thoughts for this movie:</h2>
				{#if ratingMovie}
					<p class="rating-modal-movie">{ratingMovie.title}</p>
				{/if}
				<div
					class="rating-stars-wrap"
					role="group"
					aria-label="Rate 1 to 5 stars"
					onmouseleave={() => (starHover = 0)}
				>
					{#each [1, 2, 3, 4, 5] as star}
						<form
							method="post"
							action="?/setRating"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									await invalidateAll();
									closeRatingModal();
								};
							}}
							class="rating-star-form"
						>
							<input type="hidden" name="id" value={lastDroppedId} />
							<input type="hidden" name="rating" value={star} />
							<button
								type="submit"
								class="rating-star-btn"
								class:star-hovered={starHover >= star}
								title="{star} star{star === 1 ? '' : 's'}"
								onmouseenter={() => (starHover = star)}
							>
								<span class="rating-star" aria-hidden="true">{starHover >= star ? '★' : '☆'}</span>
							</button>
						</form>
					{/each}
				</div>
				<p id="rating-modal-copy" class="rating-modal-copy">{starCopy}</p>
			</div>
		</div>
	{/if}

	<!-- Filters: row 1 = count + Filters button; row 2 (when open) = helper text + Status/Genre dropdowns -->
	{#if data.watchlist.length > 0}
		<div class="filters-bar">
			<!-- Row 1: count + Filters button -->
			<div class="filters-wrap">
				<p class="filters-count">
					{filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'movie' : 'movies'}
				</p>
				<div class="filters-actions">
					{#if hasActiveFilters}
						<span
							class="filters-clear-wrap"
							in:fade={{ duration: 180, easing: (t) => t * (2 - t) }}
							out:fade={{ duration: 220, easing: (t) => t * t }}
						>
							<button
								type="button"
								class="filters-clear-btn"
								onclick={() => { filterStatus = 'all'; filterGenre = 'all'; }}
							>
								Clear filters
							</button>
						</span>
					{/if}
					<!-- Live region so screen readers hear filter count when it changes -->
					<div
						class="sr-only"
						aria-live="polite"
						aria-atomic="true"
						aria-relevant="text"
					>
						{#if activeFiltersCount > 0}
							{activeFiltersCount} filter{activeFiltersCount === 1 ? '' : 's'} active
						{/if}
					</div>
					<button
						type="button"
						class="filters-trigger"
						class:active={hasActiveFilters}
						aria-expanded={filtersOpen}
						aria-haspopup="true"
						aria-controls="filters-options-row"
						aria-label={activeFiltersCount > 0 ? `Filters, ${activeFiltersCount} active` : 'Filters'}
						id="filters-trigger"
						bind:this={filtersButtonEl}
						onclick={() => (filtersOpen = !filtersOpen)}
					>
						<span class="filters-trigger-text">Filters</span>
						{#if activeFiltersCount > 0}
							<span
								class="filters-trigger-badge"
								aria-hidden="true"
								in:fade={{ duration: 160, easing: (t) => t * (2 - t) }}
								out:fade={{ duration: 200, easing: (t) => t * t }}
							>{activeFiltersCount}</span>
						{/if}
						<span class="filters-trigger-chevron" class:open={filtersOpen} aria-hidden="true">
							<ChevronDown size={16} />
						</span>
					</button>
				</div>
			</div>
			<!-- Row 2 (after tapping Filters): helper text + dropdowns -->
			{#if filtersOpen}
				<div
					id="filters-options-row"
					class="filters-options-row"
					in:slide={{ duration: 220, easing: (t) => t * (2 - t) }}
					out:slide={{ duration: 160, easing: (t) => t * t }}
				>
					<p class="filters-options-hint">You can filter by status or genre.</p>
					<div class="filters-dropdowns">
						<div class="filter-dropdown-wrap">
							<button
								type="button"
								class="filter-dropdown-trigger"
								aria-expanded={statusDropdownOpen}
								aria-haspopup="listbox"
								aria-label="Status filter"
								onclick={() => {
									statusDropdownOpen = !statusDropdownOpen;
									if (statusDropdownOpen) genreDropdownOpen = false;
								}}
							>
								Status: {statusLabel}
								<ChevronDown size={14} />
							</button>
							{#if statusDropdownOpen}
								<div
									class="filter-dropdown-menu"
									role="listbox"
									in:slide={{ duration: 180, easing: (t) => t * (2 - t) }}
									out:slide={{ duration: 120, easing: (t) => t * t }}
								>
									<button type="button" role="option" class="filter-dropdown-option" class:selected={filterStatus === 'all'} onclick={() => { filterStatus = 'all'; statusDropdownOpen = false; }}>All</button>
									<button type="button" role="option" class="filter-dropdown-option" class:selected={filterStatus === 'to-watch'} onclick={() => { filterStatus = 'to-watch'; statusDropdownOpen = false; }}>Watchlist</button>
									<button type="button" role="option" class="filter-dropdown-option" class:selected={filterStatus === 'watched'} onclick={() => { filterStatus = 'watched'; statusDropdownOpen = false; }}>Watched</button>
								</div>
							{/if}
						</div>
						<div class="filter-dropdown-wrap">
							<button
								type="button"
								class="filter-dropdown-trigger"
								aria-expanded={genreDropdownOpen}
								aria-haspopup="listbox"
								aria-label="Genre filter"
								onclick={() => {
									genreDropdownOpen = !genreDropdownOpen;
									if (genreDropdownOpen) statusDropdownOpen = false;
								}}
							>
								Genre: {genreLabel}
								<ChevronDown size={14} />
							</button>
							{#if genreDropdownOpen}
								<div
									class="filter-dropdown-menu filter-dropdown-menu-genres"
									role="listbox"
									in:slide={{ duration: 180, easing: (t) => t * (2 - t) }}
									out:slide={{ duration: 120, easing: (t) => t * t }}
								>
									<button type="button" role="option" class="filter-dropdown-option" class:selected={filterGenre === 'all'} onclick={() => { filterGenre = 'all'; genreDropdownOpen = false; }}>All</button>
									{#each genresFromList as g}
										<button type="button" role="option" class="filter-dropdown-option" class:selected={filterGenre === g} onclick={() => { filterGenre = g; genreDropdownOpen = false; }}>{g}</button>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
		{#if statusDropdownOpen || genreDropdownOpen}
			<div
				class="filters-backdrop"
				aria-hidden="true"
				onclick={() => { statusDropdownOpen = false; genreDropdownOpen = false; }}
			></div>
		{/if}
	{/if}

	<!-- Poster strip: each poster = same hero shape + behavior (tilt, shadow) -->
	<div class="poster-strip-wrap" use:blockVerticalWheelOnHorizontalScroll>
		<div class="poster-strip-inner">
			{#if data.watchlist.length === 0}
				<p class="empty">No movies yet. Add one from the search bar above.</p>
			{:else if filteredWatchlist.length === 0}
				<p class="empty">No movies match the current filters.</p>
			{:else}
				<ul class="poster-grid" role="list">
					{#each filteredWatchlist as item, i (item.id)}
						{@const isWatched = !!item.watchedAt || optimisticallyWatchedIds.includes(item.id)}
						{@const posterUrl = getPosterUrl(item)}
						<li
							class="poster-card hero-poster"
							class:watched={isWatched}
							class:to-watch={!isWatched}
							draggable={true}
							ondragstart={(e) => handleDragStart(e, item.id)}
							onmouseenter={(e) => handleCardMouseEnter(e, i)}
							onmouseleave={handleCardMouseLeave}
							onmousemove={(e) => handleCardMouseMove(e, i)}
							style="animation-delay: {i * 0.04}s; {hoveredCardIndex === i && !reduceMotion ? getCardHoverStyle(mouseInCardX, mouseInCardY) : ''}"
							in:fade={{ duration: reduceMotion ? 0 : 260, delay: reduceMotion ? 0 : Math.min(i * 10, 80), easing: reduceMotion ? undefined : (t) => t * (2 - t) }}
							out:fade={{ duration: reduceMotion ? 0 : 200, easing: reduceMotion ? undefined : (t) => t * t }}
						>
							<div class="vhs-case">
								<div class="vhs-spine" aria-hidden="true"></div>
								<div class="vhs-face">
							<div class="poster" class:watched={isWatched}>
								<div class="poster-scanlines" aria-hidden="true"></div>
								{#if isWatched && (item.id !== lastDroppedId || stickerRevealedForDrop)}
									{@const r = item.rating}
									{@const stickerRating = r === '1' || r === '2' ? 'bad' : r === '3' ? 'average' : (r === '4' || r === '5') ? 'good' : 'average'}
									{@const isRewatch = (item.rewatchCount ?? 0) > 0}
									{@const stickerLabel = isRewatch ? 'Rewatched' : 'Watched'}
									<div class="poster-watched-sticker sticker-{stickerRating}" class:sticker-rewatched={isRewatch} aria-label={item.rating ? `${item.rating} star(s)` : stickerLabel}>
										<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
											<circle cx="20" cy="20" r="19" fill="var(--sticker-fill)"/>
											<defs>
												<path id="sticker-arc-{item.id}" d="M 8 20 A 12 12 0 0 1 32 20"/>
											</defs>
											<text fill="var(--sticker-text)" font-family="VT323, monospace" font-size="10" font-weight="700">
												<textPath href="#sticker-arc-{item.id}" startOffset="50%" text-anchor="middle">{stickerLabel}</textPath>
											</text>
											<text x="20" y="20.6" fill="var(--sticker-text)" font-family="VT323, monospace" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 20 20)">
												{stickerRating === 'good' ? ':)' : stickerRating === 'bad' ? ':(' : ':/'}
											</text>
										</svg>
									</div>
								{/if}
								{#if posterUrl}
									<img
										class="poster-image"
										src={posterUrl}
										alt={item.title}
										loading="lazy"
										decoding="async"
										referrerpolicy="strict-origin-when-cross-origin"
										onerror={(e) => {
											const el = e.currentTarget;
											const placeholder = el?.nextElementSibling as HTMLElement | null;
											if (el && placeholder) {
												el.hidden = true;
												placeholder.hidden = false;
											}
										}}
									/>
									<div class="poster-placeholder" aria-hidden="true" hidden><span class="poster-placeholder-title">{item.title}</span></div>
								{:else}
									<div class="poster-placeholder" aria-hidden="true">
										<span class="poster-placeholder-title">{item.title}</span>
									</div>
								{/if}
								<div class="poster-title-overlay">
									<span class="poster-meta-text">
										{#if item.genre || item.year}
											{[item.genre, item.year].filter(Boolean).join(' · ')}
										{:else}
											{item.title}
										{/if}
									</span>
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

	<!-- Drop zone: floating VHS player, bottom right -->
	<div class="vhs-drop-wrap">
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
					/* Do not clear lastDroppedId here – rating modal needs it after transition */
				};
			}}
			bind:this={dropForm}
			class="drop-form"
			aria-hidden="true"
		>
			<input type="hidden" name="id" value="" />
		</form>
		<div class="vhs-player" aria-hidden="true">
			<!-- Scrolling slot text: HTML overlay so it stays inside black band and loops seamlessly -->
			<div class="vhs-slot-text-overlay" aria-hidden="true">
				<div class="vhs-slot-text-wrap">
					<span class="vhs-slot-text">Drag and drop your movies here to mark as watched</span>
					<span class="vhs-slot-text">Drag and drop your movies here to mark as watched</span>
				</div>
			</div>
			<svg viewBox="0 0 420 88" fill="none" xmlns="http://www.w3.org/2000/svg">
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
					<filter id="vhsChromaText" x="-30%" y="-30%" width="160%" height="160%">
						<feDropShadow dx="0.4" dy="0" stdDeviation="0.5" flood-color="#0000CC" flood-opacity="0.45"/>
						<feDropShadow dx="0" dy="0" stdDeviation="0" flood-color="#e8e8e8"/>
					</filter>
				</defs>
				<!-- Main body -->
				<rect x="8" y="4" width="404" height="80" rx="6" fill="url(#vhsBody)" filter="url(#vhsShadow)" />
				<!-- Bevel / top edge highlight -->
				<path d="M8 10 L416 10 L412 4 L16 4 Z" fill="#52525b" opacity="0.6" />
				<!-- Tape slot (drop target area) -->
				<rect x="28" y="14" width="340" height="36" rx="3" fill="url(#vhsSlot)" stroke="#3f3f46" stroke-width="1.5" />
				<rect x="32" y="18" width="332" height="28" rx="2" fill="#0d0d0f" />
				<!-- Timer screen: same width as slot; blue LED beside it -->
				<rect x="28" y="52" width="340" height="24" rx="2" fill="#0a0a0b" stroke="#3f3f46" stroke-width="0.8" />
				<text x="198" y="67" text-anchor="middle" class="vhs-display-time" font-size="12" font-family="VT323, monospace">0:00:00</text>
				<!-- Power / record LED -->
				<circle cx="376" cy="64" r="3" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
				<circle cx="376" cy="64" r="1.5" class="vhs-led-dot" opacity="0.9" />
			</svg>
		</div>
	</section>
	</div>
</div>
{:else}
	<div transition:fade={{ duration: 320 }}>
		<Landing />
	</div>
{/if}

<style>
	/* Watchlist page — Index
	   1. Page layout
	   2. Drop VHS full-screen transition ("Watched")
	   3. Rating modal
	   4. Filters (bar, dropdowns, trigger)
	   5. Desktop layout (fill main)
	   6. Poster strip (hero cards, empty state)
	   7. VHS drop zone & player (slot text, toast)
	   8. Poster grid (horizontal strip)
	   9. Poster cards (scanlines, sticker, etc.)
	   10. Typography / misc
	*/

	/* 1. Page layout */
	.page {
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
		min-height: 100vh;
	}

	/* 2. Drop VHS full-screen transition ("Watched") */
	.drop-vhs-screen {
		position: fixed;
		inset: 0;
		z-index: 10000;
		background: var(--vhs-screen-blue);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		animation: drop-vhs-soft-in 0.55s ease-out;
	}

	@keyframes drop-vhs-soft-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.drop-vhs-screen {
			animation: none;
		}
	}

	.drop-vhs-screen-inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-family: 'VT323', monospace;
		pointer-events: none;
	}

	.drop-vhs-play {
		font-size: clamp(1.5rem, 4vw, 2.5rem);
		font-weight: 600;
		color: var(--white);
		letter-spacing: 0.1em;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
	}

	.drop-vhs-time {
		font-size: clamp(1rem, 2.8vw, 1.5rem);
		font-weight: 600;
		color: var(--badge-text);
		letter-spacing: 0.08em;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.35);
	}

	.drop-vhs-scanlines {
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

	.drop-vhs-grain {
		position: absolute;
		inset: 0;
		background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
		opacity: 0.04;
		mix-blend-mode: overlay;
		pointer-events: none;
	}

	/* 3. Rating modal */
	.rating-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10001;
		background: var(--modal-backdrop);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		animation: fade-in 0.2s ease-out;
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.rating-modal {
		background: var(--modal-bg);
		border: 1px solid var(--modal-border);
		border-radius: 12px;
		padding: 1.5rem 2rem;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
	}
	.rating-modal-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--modal-text);
		white-space: nowrap;
	}
	.rating-modal-movie {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		color: var(--modal-text-muted);
	}
	.rating-stars-wrap {
		display: flex;
		gap: 0.25rem;
		justify-content: center;
		align-items: center;
		margin-bottom: 0.75rem;
	}
	.rating-star-form {
		display: block;
	}
	.rating-star-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--modal-text-muted);
		font-size: 1.75rem;
		cursor: pointer;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
		border-radius: 6px;
	}
	.rating-star-btn:hover {
		transform: scale(1.15);
		color: var(--rating-star);
	}
	.rating-star-btn.star-hovered {
		color: var(--rating-star);
	}
	.rating-star-btn:focus-visible {
		outline: 2px solid var(--modal-focus-border);
		outline-offset: 2px;
	}
	.rating-star-btn:active {
		transform: scale(0.95);
	}
	.rating-star {
		display: inline-block;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.rating-star-btn:hover .rating-star {
		transform: scale(1.1);
	}
	.rating-modal-copy {
		margin: 0;
		font-size: 0.9rem;
		color: var(--modal-text-muted);
		text-align: center;
		line-height: 1.4;
		min-height: 2.8em;
		display: flex;
		align-items: center;
		justify-content: center;
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

	/* 4. Filters (bar, dropdowns, trigger) */
	.filters-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.filters-count {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text);
	}
	.filters-trigger {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: auto;
		padding: 0.4rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		font-family: inherit;
		line-height: 1;
		border: none;
		border-radius: 0;
		background: none;
		color: var(--text);
		cursor: pointer;
		transition: color 0.2s ease, opacity 0.2s ease;
	}
	.filters-trigger:hover {
		color: var(--link);
		opacity: 0.95;
	}
	.filters-trigger:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}
	.filters-trigger-text {
		font-weight: 600;
	}
	.filters-trigger-chevron {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease;
	}
	.filters-trigger-chevron.open {
		transform: rotate(180deg);
	}
	.filters-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.filters-clear-wrap {
		display: inline-flex;
	}
	.filters-clear-btn {
		padding: 0.35em 0.6em;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: inherit;
		color: var(--link);
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease;
	}
	.filters-clear-btn:hover {
		background-color: var(--surface-overlay-light);
		color: var(--text);
	}
	.filters-clear-btn:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}
	.filters-trigger-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1;
		border-radius: 999px;
		background: var(--badge-bg);
		color: var(--badge-text);
		border: 1px solid var(--badge-border);
	}
	.filters-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		background: transparent;
	}
	.filters-bar {
		padding: 0 var(--page-padding-x) 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0;
	}
	.filters-options-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		border-top: 1px solid var(--border);
	}
	.filters-options-hint {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}
	.filters-dropdowns {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}
	.filter-dropdown-wrap {
		position: relative;
	}
	.filter-dropdown-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		height: 38px;
		padding: 0 0.75rem 0 1rem;
		font-size: 0.9rem;
		font-weight: 500;
		font-family: inherit;
		line-height: 1;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-overlay-light);
		color: var(--text);
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease;
	}
	.filter-dropdown-trigger:hover {
		background: var(--surface-hover-strong);
		border-color: var(--input-border);
	}
	.filter-dropdown-trigger:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}
	.filter-dropdown-menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		z-index: 9999;
		min-width: 100%;
		padding: 0.35rem;
		background: var(--modal-bg);
		border: 1px solid var(--modal-border);
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}
	.filter-dropdown-menu-genres {
		max-height: 200px;
		overflow-y: auto;
	}
	.filter-dropdown-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		font-family: inherit;
		font-weight: 500;
		color: var(--text);
		background: none;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s ease;
	}
	.filter-dropdown-option:hover {
		background: var(--surface-hover-strong);
	}
	.filter-dropdown-option.selected {
		background: var(--surface-selected);
		color: var(--link);
	}
	.filter-dropdown-option:focus-visible {
		outline: none;
		background: var(--surface-hover-strong);
	}

	/* 5. Desktop layout (fill main) */
	@media (min-height: 700px) {
		.page {
			height: 100%;
			min-height: 0;
		}
		.poster-strip-wrap {
			flex: 1;
			min-height: 0;
			padding: 0 var(--page-padding-x) 1rem;
		}
	}

	/* 6. Poster strip (hero cards, empty state) */
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
		animation: hero-poster-in 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
		transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
		transform-style: preserve-3d;
		transform: translate3d(0, 0, 0); /* base so hover inline transform can transition smoothly */
		backface-visibility: hidden;
		will-change: transform;
	}
	@keyframes hero-poster-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	/* Hover: 3D tilt + shadow from inline style; no transform in keyframes so inline can win */
	@media (hover: hover) {
		.poster-card.hero-poster:hover {
			box-shadow: 0 36px 60px rgba(0, 0, 0, 0.3);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.poster-card.hero-poster {
			animation: none;
		}
		.poster-card.hero-poster:hover {
			transform: none;
		}
	}

	/* 7. VHS drop zone & player (slot text, toast) */
	.vhs-drop-wrap {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 40;
	}
	.vhs-drop {
		position: relative;
		width: 436px;
		height: 138px;
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
		position: relative;
		width: 420px;
		height: 90px;
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
	/* Slot text: overlay aligned to black band; player 420×90, SVG viewBox 420×88 (1px letterbox top) */
	.vhs-slot-text-overlay {
		position: absolute;
		left: 7.62%;
		top: 21.11%;
		width: 79.05%;
		height: 31.11%;
		overflow: hidden;
		pointer-events: none;
		border-radius: 2px;
	}
	.vhs-slot-text-wrap {
		display: flex;
		flex-wrap: nowrap;
		white-space: nowrap;
		height: 100%;
		align-items: center;
		width: 200%;
		animation: vhs-text-scroll 20s linear infinite;
	}
	.vhs-slot-text {
		flex: 0 0 50%;
		width: 50%;
		display: inline-block;
		text-align: center;
		font-family: VT323, monospace;
		font-size: 16px;
		color: var(--text);
		line-height: 1;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
	}
	/* Move by one panel (50% of wrap) so as text exits left, the duplicate enters from right */
	@keyframes vhs-text-scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.vhs-slot-text-wrap {
			animation: none;
		}
	}
	.vhs-player :global(.vhs-display-time),
	.vhs-player :global(.vhs-led-dot) {
		fill: var(--neon-blue);
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

	/* 8. Poster grid (horizontal strip) */
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
		overscroll-behavior-x: contain;
		touch-action: pan-x; /* vertical gestures don't drive horizontal scroll here */
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

	/* 9. Poster cards (VHS case, scanlines, sticker) */
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
		background: linear-gradient(90deg, rgba(13, 13, 13, 0.65) 0%, rgba(26, 26, 26, 0.6) 40%, rgba(37, 37, 37, 0.55) 100%);
		border-radius: 6px 0 0 6px;
		box-shadow: inset -2px 0 4px rgba(0, 0, 0, 0.3);
	}

	.vhs-face {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: rgba(17, 17, 17, 0.5);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 3px solid rgba(26, 26, 26, 0.7);
		border-left: none;
		border-radius: 0 6px 6px 0;
		overflow: hidden;
	}

	/* Plastic-sleeve sheen over the poster window (frosted clear plastic) – behind the image so poster is visible */
	.poster::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, transparent 35%, transparent 100%);
		pointer-events: none;
		z-index: 0;
		border-radius: inherit;
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
		border: 2px solid var(--poster-bg);
		margin: 4px;
		box-sizing: border-box;
	}

	/* Scanlines on top of the image for VHS effect */
	.poster-scanlines {
		position: absolute;
		inset: 0;
		z-index: 2;
		pointer-events: none;
		background-image: repeating-linear-gradient(
			0deg,
			transparent 0px,
			transparent 2px,
			rgba(0, 0, 0, 0.1) 2px,
			rgba(0, 0, 0, 0.1) 4px
		);
		background-size: 100% 4px;
	}

	.poster.watched {
		opacity: 0.88;
	}

	/* Circle sticker for watched movies: no lines (overlay is behind content) */
	.poster-watched-sticker {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 4;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		box-shadow:
			0 0 0 2px #fff,
			0 3px 12px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.18),
			inset 0 0 0 2px var(--sticker-outline, var(--sticker-fill, #333)),
			inset 0 2px 4px rgba(255, 255, 255, 0.35),
			inset 0 -1px 2px rgba(0, 0, 0, 0.1);
		transform: rotate(-8deg);
		overflow: hidden;
	}

	.poster-watched-sticker svg {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 50%;
	}

	/* Good: green sticker → dark green outline + text (WCAG AA) */
	.poster-watched-sticker.sticker-good {
		--sticker-fill: #22c55e;
		--sticker-outline: #14532d;
		--sticker-text: #14532d;
	}
	.poster-watched-sticker.sticker-good.sticker-rewatched {
		--sticker-fill: #14532d;
		--sticker-outline: #22c55e;
		--sticker-text: #22c55e;
	}
	/* Average: purple sticker → dark purple outline + text */
	.poster-watched-sticker.sticker-average {
		--sticker-fill: #7c3aed;
		--sticker-outline: #4c1d95;
		--sticker-text: #4c1d95;
	}
	.poster-watched-sticker.sticker-average.sticker-rewatched {
		--sticker-fill: #4c1d95;
		--sticker-outline: #7c3aed;
		--sticker-text: #7c3aed;
	}
	/* Bad: yellow sticker → dark amber outline + text */
	.poster-watched-sticker.sticker-bad {
		--sticker-fill: #eab308;
		--sticker-outline: #713f12;
		--sticker-text: #713f12;
	}
	.poster-watched-sticker.sticker-bad.sticker-rewatched {
		--sticker-fill: #713f12;
		--sticker-outline: #eab308;
		--sticker-text: #eab308;
	}

	.poster-watched-sticker {
		animation: sticker-appear 0.4s ease-out;
	}
	@keyframes sticker-appear {
		from {
			opacity: 0;
			transform: rotate(-8deg) scale(0.6);
		}
		to {
			opacity: 1;
			transform: rotate(-8deg) scale(1);
		}
	}

	.poster-overlay {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--overlay-mask);
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
		color: var(--white);
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
		position: absolute;
		top: 0.5rem;
		left: 50%;
		transform: translateX(-50%);
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
		z-index: 1;
	}

	.poster-title-overlay {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 3;
		padding: 0.5rem 0.6rem 0.45rem;
		background: #0d0d0d;
		border-top: 2px solid #333;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		/* VHS label strip at bottom of case */
		min-height: 2.5rem;
	}

	.poster-title-text,
	.poster-meta-text {
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.25;
		color: #e5e5e5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		letter-spacing: 0.03em;
	}

	.poster-meta-text {
		text-transform: none;
	}

	.poster-placeholder {
		position: absolute;
		inset: 0;
		padding: 1.25rem 1rem;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--poster-bg);
	}
	.poster-placeholder-title {
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.3;
		color: var(--poster-text);
		display: -webkit-box;
		-webkit-line-clamp: 6;
		-webkit-box-orient: vertical;
		overflow: hidden;
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
