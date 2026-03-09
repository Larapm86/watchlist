<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Plus from '$lib/components/icons/Plus.svelte';
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

	<!-- Upper part: add movie + list -->
	<div class="queue-section">
		<section class="add-form">
			<form method="post" action="?/add" use:enhance>
				<label for="title">Add movie</label>
				<div class="input-row">
					<input id="title" type="text" name="title" placeholder="Movie title" required />
					<button type="submit" title="Add movie">
						<Plus size={20} />
						Add
					</button>
				</div>
			</form>
			{#if form?.message}
				<p class="form-error">{form.message}</p>
			{/if}
		</section>

		<section class="list">
			{#if data.watchlist.length === 0}
				<p class="empty">No movies yet. Add one above.</p>
			{:else}
				<ul class="poster-grid">
					{#each data.watchlist as item}
						{@const isWatched =
							(!!item.watchedAt || optimisticallyWatchedIds.includes(item.id)) &&
							!optimisticallyUnwatchedIds.includes(item.id)}
						{@const posterUrl = getPosterUrl(item)}
						<li
							class="poster-card"
							class:watched={isWatched}
							class:to-watch={!isWatched}
							draggable={!isWatched}
							ondragstart={(e) => handleDragStart(e, item.id)}
						>
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
										{#if !isWatched}
											<form method="post" action="?/markWatched" use:enhance={({ formData }) => {
												const idVal = formData.get('id');
												const id = typeof idVal === 'string' ? parseInt(idVal, 10) : Number(idVal);
												if (!Number.isNaN(id) && id > 0) {
													optimisticallyWatchedIds = [...optimisticallyWatchedIds, id];
													showMarkedFeedback();
												}
												return async ({ update }) => {
													try { await update(); await invalidateAll(); } catch (_) {}
													optimisticallyWatchedIds = optimisticallyWatchedIds.filter((x) => x !== id);
												};
											}} class="overlay-form">
												<input type="hidden" name="id" value={item.id} />
												<button type="submit" class="overlay-btn" title="Mark this movie as watched">
													<Check size={22} />
												</button>
											</form>
										{:else}
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
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>

	<!-- Lower part: cinema illustration + drop zone -->
	<section
		class="cinema"
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

		<div class="cinema-scene">
			<!-- Curtains -->
			<div class="curtains">
				<div class="curtain curtain-left"></div>
				<div class="curtain curtain-right"></div>
			</div>
			<!-- Screen -->
			<div class="screen">
				<svg class="screen-glow" viewBox="0 0 200 40" aria-hidden="true">
					<defs>
						<linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
							<stop offset="0%" stop-color="var(--screen-bright)" stop-opacity="0.4" />
							<stop offset="100%" stop-color="var(--screen-bright)" stop-opacity="0.05" />
						</linearGradient>
					</defs>
					<rect width="200" height="40" fill="url(#screenGrad)" />
				</svg>
			</div>
			<!-- Seats silhouette -->
			<div class="seats">
				<svg class="seats-svg" viewBox="0 0 240 60" aria-hidden="true">
					<g fill="var(--text-muted)" opacity="0.25">
						<!-- Rows of seat shapes -->
						<rect x="10" y="8" width="20" height="12" rx="2" />
						<rect x="40" y="8" width="20" height="12" rx="2" />
						<rect x="70" y="8" width="20" height="12" rx="2" />
						<rect x="100" y="8" width="20" height="12" rx="2" />
						<rect x="130" y="8" width="20" height="12" rx="2" />
						<rect x="160" y="8" width="20" height="12" rx="2" />
						<rect x="190" y="8" width="20" height="12" rx="2" />
						<rect x="25" y="28" width="20" height="12" rx="2" />
						<rect x="55" y="28" width="20" height="12" rx="2" />
						<rect x="85" y="28" width="20" height="12" rx="2" />
						<rect x="115" y="28" width="20" height="12" rx="2" />
						<rect x="145" y="28" width="20" height="12" rx="2" />
						<rect x="175" y="28" width="20" height="12" rx="2" />
						<rect x="40" y="48" width="20" height="12" rx="2" />
						<rect x="70" y="48" width="20" height="12" rx="2" />
						<rect x="100" y="48" width="20" height="12" rx="2" />
						<rect x="130" y="48" width="20" height="12" rx="2" />
						<rect x="160" y="48" width="20" height="12" rx="2" />
					</g>
				</svg>
			</div>
		</div>
		<p class="cinema-hint">Drag a movie here to mark as watched</p>
	</section>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		position: relative;
	}

	.toast {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--watched-badge-bg);
		color: var(--watched-badge-text);
		border: 1px solid var(--watched-badge-border);
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		animation: toast-in 0.2s ease-out;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(0.5rem);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.queue-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.add-form {
		margin-bottom: 0;
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.input-row input {
		flex: 1;
		min-width: 0;
		margin-top: 0;
	}

	.input-row button {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0;
		flex-shrink: 0;
	}

	.empty {
		color: var(--text-muted);
		font-size: 0.9375rem;
		margin: 0;
		padding: 0.75rem 0 0;
	}

	.list {
		min-height: 0;
	}

	.poster-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 220px));
		gap: 1.25rem 1.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.poster-grid > li {
		padding: 0;
		border-bottom: none;
	}

	.poster-card {
		display: flex;
		flex-direction: column;
		cursor: default;
		border-radius: 12px;
		overflow: hidden;
		background: var(--card-bg);
		border: 1px solid var(--border);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.poster-card:hover {
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
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
		aspect-ratio: 1 / 1;
		background: var(--poster-bg);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 0;
		flex-shrink: 0;
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
		background: rgba(0, 0, 0, 0.75);
		opacity: 0;
		transition: opacity 0.2s ease;
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
		transition: transform 0.15s ease, background 0.15s ease;
	}

	.overlay-btn:hover {
		transform: scale(1.08);
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
		padding: 1.75rem 0.75rem 0.65rem;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.6) 60%, transparent 100%);
		display: flex;
		align-items: flex-end;
	}

	.poster-title-text {
		font-size: 0.9375rem;
		font-weight: 600;
		line-height: 1.3;
		color: #fff;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
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

	/* Cinema section */
	.cinema {
		position: relative;
		border-radius: 12px;
		border: 2px dashed var(--border);
		background: var(--card-bg);
		min-height: 160px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		transition: border-color 0.15s, background 0.15s;
	}

	.cinema.drop-active {
		border-color: var(--link);
		background: var(--focus-ring);
	}

	.drop-form {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;
	}

	.cinema-scene {
		position: relative;
		width: 100%;
		max-width: 320px;
		padding: 1rem 1rem;
	}

	.curtains {
		position: relative;
		height: 48px;
		display: flex;
		justify-content: center;
		gap: 0;
	}

	.curtain {
		flex: 1;
		max-width: 120px;
		background: linear-gradient(
			180deg,
			var(--curtain-top) 0%,
			var(--curtain-mid) 40%,
			var(--curtain-bottom) 100%
		);
		border-radius: 2px;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
	}

	.curtain-left {
		border-radius: 4px 0 0 4px;
	}

	.curtain-right {
		border-radius: 0 4px 4px 0;
	}

	.screen {
		margin: 0 auto 1rem;
		height: 32px;
		background: var(--screen-bg);
		border-radius: 2px;
		overflow: hidden;
	}

	.screen-glow {
		width: 100%;
		height: 100%;
		display: block;
	}

	.seats {
		width: 100%;
	}

	.seats-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	.cinema-hint {
		font-size: 0.8125rem;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
	}

	/* Cinema theme variables (override in dark if needed) */
	:global(html) {
		--curtain-top: #8b1538;
		--curtain-mid: #6b0f2a;
		--curtain-bottom: #4a0a1e;
		--screen-bg: #1a1a2e;
		--screen-bright: #e0e0ff;
	}

	@media (prefers-color-scheme: dark) {
		:global(html) {
			--curtain-top: #6b0f2a;
			--curtain-mid: #4a0a1e;
			--curtain-bottom: #2d0612;
			--screen-bright: #a0a0cc;
		}
	}
</style>
