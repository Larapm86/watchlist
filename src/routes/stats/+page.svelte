<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = $derived(data?.watchlistStats);
</script>

<svelte:head>
	<title>Your stats</title>
</svelte:head>

<div class="stats-page">
	<header class="stats-header">
		<a href="/" class="stats-back">← Back to watchlist</a>
	</header>

	{#if stats}
		<div class="stats-columns">
			<div class="stats-col stats-col-left">
				<section class="stats-section" aria-labelledby="stats-overview">
					<h2 id="stats-overview" class="stats-section-title">Overview</h2>
					<div class="stats-grid">
						<div class="stats-card">
							<span class="stats-card-value">{stats.moviesWatched}</span>
							<span class="stats-card-label">Movies watched</span>
						</div>
						<div class="stats-card">
							<span class="stats-card-value">{stats.inWatchlist}</span>
							<span class="stats-card-label">In your watchlist</span>
						</div>
						<div class="stats-card">
							<span class="stats-card-value">{stats.watchedThisMonth}</span>
							<span class="stats-card-label">This month</span>
						</div>
						<div class="stats-card">
							<span class="stats-card-value">{stats.watchedThisYear}</span>
							<span class="stats-card-label">This year</span>
						</div>
						<div class="stats-card">
							<span class="stats-card-value">{stats.rewatches ?? 0}</span>
							<span class="stats-card-label">Re-watches</span>
						</div>
						{#if stats.averageRating != null}
							<div class="stats-card">
								<span class="stats-card-value">{stats.averageRating} ★</span>
								<span class="stats-card-label">Average rating</span>
							</div>
						{/if}
						{#if stats.totalRuntimeFormatted}
							<div class="stats-card">
								<span class="stats-card-value">{stats.totalRuntimeFormatted}</span>
								<span class="stats-card-label">Total runtime</span>
							</div>
						{/if}
					</div>
				</section>
			</div>
			<div class="stats-col stats-col-right">
				<section class="stats-section" aria-labelledby="stats-movies-this-month">
					<h2 id="stats-movies-this-month" class="stats-section-title">Movies this month</h2>
					<p class="stats-line">{stats.watchedThisMonth} {stats.watchedThisMonth === 1 ? 'movie' : 'movies'} this month</p>
				</section>
				{#if stats.criticStyle || stats.moodPhase}
					<section class="stats-section stats-section-fun" aria-label="Critic's Lens and Lately">
						<div class="stats-fun-list">
							{#if stats.criticStyle}
								<p class="stats-line stats-line-fun">
									<span class="stats-fun-label">Critic's Lens</span>
									{stats.criticStyle}
								</p>
							{/if}
							{#if stats.moodPhase}
								<p class="stats-line stats-line-fun">
									<span class="stats-fun-label">Lately</span>
									{stats.moodPhase}
								</p>
							{/if}
						</div>
					</section>
				{/if}
			</div>
		</div>
	{:else}
		<p class="stats-empty">No stats yet. Add and watch movies to see your stats.</p>
	{/if}
</div>

<style>
	/* Stats page
	   -------------
	   1. Page layout
	   2. Two-column layout (responsive)
	   3. Back link
	   4. Section titles
	   5. Overview grid & cards
	   6. Critic's Lens / Lately block
	   7. Empty state
	*/

	/* 1. Page layout */
	.stats-page {
		width: 100%;
		max-width: none;
		margin: 0;
		padding: 2rem var(--page-padding-x, 1.5rem);
		box-sizing: border-box;
	}

	.stats-header {
		margin-bottom: 2rem;
	}

	/* 2. Two-column layout (responsive) */
	.stats-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2.5rem;
		align-items: start;
	}

	@media (max-width: 640px) {
		.stats-columns {
			grid-template-columns: 1fr;
		}
	}

	.stats-col {
		min-width: 0;
	}

	/* 3. Back link */
	.stats-back {
		display: inline-block;
		font-size: 0.9375rem;
		color: var(--link);
		text-decoration: none;
		padding: 0.35em 0.6em;
		margin: -0.35em -0.6em;
		border-radius: 6px;
		transition: background-color 0.2s ease, color 0.2s ease;
	}

	.stats-back:hover {
		background-color: var(--surface-overlay-light);
		color: var(--text);
	}

	/* 4. Section titles */
	.stats-section {
		margin-bottom: 2rem;
	}

	.stats-section-title {
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin: 0 0 0.75rem;
	}

	/* 5. Overview grid & cards */
	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: repeat(3, auto);
		gap: 1rem;
	}

	.stats-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 12px;
	}

	.stats-card-value {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1.2;
	}

	.stats-card-label {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.stats-line {
		margin: 0;
		font-size: 1rem;
		color: var(--text);
		line-height: 1.5;
	}

	/* 6. Critic's Lens / Lately block */
	.stats-fun-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.stats-line-fun {
		color: var(--text);
		font-weight: 500;
		margin: 0;
	}

	.stats-fun-label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.2rem;
	}

	/* 7. Empty state */
	.stats-empty {
		margin: 0;
		font-size: 1rem;
		color: var(--text-muted);
	}
</style>
