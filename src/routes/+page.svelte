<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import X from '$lib/components/icons/X.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

<div class="page">
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
		{@const ratingMovie = data.watchlist.find((w) => w.id === lastDroppedId)}
		{@const starCopy = starHover <= 0 ? 'How was it? Tap a star to rate.' : starHover <= 2 ? 'Not for me — didn\'t love it.' : starHover === 3 ? 'It was okay — middle of the road.' : 'Loved it! — really enjoyed this one.'}
		<div
			class="rating-modal-backdrop"
			role="dialog"
			aria-modal="true"
			aria-labelledby="rating-modal-title"
			onclick={() => { showRatingModal = false; lastDroppedId = 0; starHover = 0; }}
		>
			<div class="rating-modal" onclick={(e) => e.stopPropagation()}>
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
									showRatingModal = false;
									lastDroppedId = 0;
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
				<p class="rating-modal-copy">{starCopy}</p>
			</div>
		</div>
	{/if}

	<!-- Poster strip: each poster = same hero shape + behavior (tilt, shadow) -->
	<div class="poster-strip-wrap" use:blockVerticalWheelOnHorizontalScroll>
		<div class="poster-strip-inner">
			{#if data.watchlist.length === 0}
				<p class="empty">No movies yet. Add one from the search bar above.</p>
			{:else}
				<ul class="poster-grid" role="list">
					{#each data.watchlist as item, i}
						{@const isWatched = !!item.watchedAt || optimisticallyWatchedIds.includes(item.id)}
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
							style="animation-delay: {i * 0.04}s; {hoveredCardIndex === i && !reduceMotion ? getCardHoverStyle(mouseInCardX, mouseInCardY) : ''}"
						>
							<div class="vhs-case">
								<div class="vhs-spine" aria-hidden="true"></div>
								<div class="vhs-face">
							<div class="poster" class:watched={isWatched}>
								<div class="poster-scanlines" aria-hidden="true"></div>
								{#if isWatched && (item.id !== lastDroppedId || stickerRevealedForDrop)}
									{@const r = item.rating}
									{@const stickerRating = r === '1' || r === '2' ? 'bad' : r === '3' ? 'average' : (r === '4' || r === '5') ? 'good' : 'average'}
									<div class="poster-watched-sticker sticker-{stickerRating}" aria-label={item.rating ? `${item.rating} star(s)` : 'Watched'}>
										<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
											<circle cx="20" cy="20" r="19" fill="var(--sticker-fill)"/>
											<defs>
												<path id="sticker-arc-{item.id}" d="M 8 20 A 12 12 0 0 1 32 20"/>
											</defs>
											<text fill="#1a1a1a" font-family="system-ui, sans-serif" font-size="8" font-weight="700">
												<textPath href="#sticker-arc-{item.id}" startOffset="50%" text-anchor="middle">Watched</textPath>
											</text>
											<text x="20" y="20" fill="#1a1a1a" font-family="system-ui, sans-serif" font-size="12" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 20 20)">
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
			<svg viewBox="0 0 322 88" fill="none" xmlns="http://www.w3.org/2000/svg">
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
				<rect x="8" y="4" width="306" height="80" rx="6" fill="url(#vhsBody)" filter="url(#vhsShadow)" />
				<!-- Bevel / top edge highlight -->
				<path d="M8 10 L318 10 L310 4 L16 4 Z" fill="#52525b" opacity="0.6" />
				<!-- Tape slot (drop target area) -->
				<rect x="28" y="14" width="272" height="36" rx="3" fill="url(#vhsSlot)" stroke="#3f3f46" stroke-width="1.5" />
				<rect x="32" y="18" width="264" height="28" rx="2" fill="#0d0d0f" />
				<!-- Slot label -->
				<text x="164" y="36" text-anchor="middle" fill="#e8e8e8" font-size="16" font-family="VT323, monospace" filter="url(#vhsChromaText)">Drag your movies here to mark as watched</text>
				<!-- Timer screen: same width as slot, uses space of removed buttons; blue LED beside it -->
				<rect x="28" y="52" width="272" height="24" rx="2" fill="#0a0a0b" stroke="#3f3f46" stroke-width="0.8" />
				<text x="164" y="67" text-anchor="middle" class="vhs-display-time" font-size="12" font-family="VT323, monospace">0:00:00</text>
				<!-- Power / record LED -->
				<circle cx="306" cy="64" r="3" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
				<circle cx="306" cy="64" r="1.5" class="vhs-led-dot" opacity="0.9" />
			</svg>
		</div>
	</section>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
		min-height: 100vh;
	}

	/* Full-screen VHS transition when dropping a movie – subtle, smooth, integrated */
	.drop-vhs-screen {
		position: fixed;
		inset: 0;
		z-index: 10000;
		background: rgba(0, 0, 204, 0.78);
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
		color: rgba(255, 255, 255, 0.9);
		letter-spacing: 0.1em;
		text-shadow: 0 0 1px rgba(0, 0, 0, 0.4);
	}

	.drop-vhs-time {
		font-size: clamp(1rem, 2.8vw, 1.5rem);
		font-weight: 600;
		color: rgba(255, 255, 255, 0.8);
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

	/* Rating modal after drop transition */
	.rating-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 10001;
		background: rgba(0, 0, 0, 0.6);
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
		background: #12121a;
		border: 1px solid #252538;
		border-radius: 12px;
		padding: 1.5rem 2rem;
		max-width: 400px;
		width: 100%;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
	}
	.rating-modal-title {
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #e8e8f0;
		white-space: nowrap;
	}
	.rating-modal-movie {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		color: #9090a0;
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
		color: #3f3f46;
		font-size: 1.75rem;
		cursor: pointer;
		transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
		border-radius: 6px;
	}
	.rating-star-btn:hover {
		transform: scale(1.15);
		color: #eab308;
	}
	.rating-star-btn.star-hovered {
		color: #eab308;
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
		color: #9090a0;
		text-align: center;
		line-height: 1.4;
		min-height: 2.8em;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Desktop: fill main without causing vertical scroll */
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

	/* VHS player drop zone: floating bottom right */
	.vhs-drop-wrap {
		position: fixed;
		bottom: 1.25rem;
		right: 1.25rem;
		z-index: 40;
	}
	.vhs-drop {
		position: relative;
		width: 338px;
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
		width: 322px;
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

	/* Plastic-sleeve sheen over the poster window (frosted clear plastic) */
	.poster::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, transparent 35%, transparent 100%);
		pointer-events: none;
		z-index: 1;
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
		border: 2px solid #1a1a1a;
		margin: 4px;
		box-sizing: border-box;
	}

	/* Scanlines only on poster face (above image; sticker/title/overlay above this) */
	.poster-scanlines {
		position: absolute;
		inset: 0;
		z-index: 1;
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
		z-index: 1;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		box-shadow:
			0 0 0 2px #fff,
			0 3px 12px rgba(0, 0, 0, 0.3),
			0 1px 4px rgba(0, 0, 0, 0.18),
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

	.poster-watched-sticker.sticker-good {
		--sticker-fill: #22c55e;
		--sticker-text: #fff;
	}
	.poster-watched-sticker.sticker-average {
		--sticker-fill: #7c3aed;
		--sticker-text: #fff;
	}
	.poster-watched-sticker.sticker-bad {
		--sticker-fill: #eab308;
		--sticker-text: #1a1a1a;
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
