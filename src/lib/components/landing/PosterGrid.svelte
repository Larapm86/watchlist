<script lang="ts">
	// Static poster paths (TMDB) for landing background – w500 for performance
	const TMDB_BASE = 'https://image.tmdb.org/t/p/w500';
	const POSTERS: string[] = [
		'/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', // The Shawshank Redemption
		'/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', // The Dark Knight
		'/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', // The Godfather
		'/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg', // Fight Club
		'/kqjL17yufvn9OVLyXYpvtyrFfak.jpg', // Pulp Fiction
		'/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', // The Lord of the Rings
		'/sF1HQ4qOZibqaxQdNDQq3Hf77Zl.jpg', // Forrest Gump
		'/9gk7adHYeDvHkCSEqAvQNLV5HuS.jpg', // Inception
		'/tlEFuIlaxRPXIYVHXbOSAMCfWqK.jpg', // Interstellar
		'/8ZTVqvKDQ8emS0EM0gTY0zRjbGI.jpg', // The Matrix
		'/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', // Titanic
		'/6oom2Q6Ql7zawzUrhFREZ6rslJb.jpg', // The Silence of the Lambs
		'/Ab8mkHnkY5pW9mfR3xn3a2Lx0TE.jpg', // Gladiator
		'/d5NXSklXo0qyIYkgV94XAgtktWC.jpg', // Saving Private Ryan
		'/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', // The Usual Suspects
		'/2u7zbn8EudG6kLlBzUYqP8RyFU4.jpg', // The Green Mile
		'/p1F51Lvj3sMopG948F5HsBbl43C.jpg', // American History X
		'/fC2HD43OHXcDPhb7FhF9NarMVzD.jpg', // Léon
		'/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg', // The Pianist
		'/2CAL2433ZeIihfX1Hb2139CX0pW.jpg', // The Departed
		'/k7sOpf0LgxPJzPQb2o8vvjYqTSz.jpg', // Back to the Future
		'/6oom2Q6Ql7zawzUrhFREZ6rslJb.jpg', // The Silence of the Lambs (dupe for density)
		'/qmDpIHrmyJ8c2B2S0M8N3qK7N2n.jpg', // Whiplash
		'/lZp2qtFrk1bbquqwwC92o7i5eYF.jpg', // Parasite
		'/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', // Get Out
		'/tGWWQ6gcGL71W7b0i0k3k4pEdxP.jpg' // Joker
	].slice(0, 24);
</script>

<div class="poster-grid" aria-hidden="true">
	{#each POSTERS as path}
		<div class="poster-cell">
			<img src="{TMDB_BASE}{path}" alt="" width="500" height="750" loading="lazy" />
		</div>
	{/each}
</div>
<div class="poster-grid-overlay" aria-hidden="true"></div>

<style>
	.poster-grid {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		grid-template-rows: repeat(4, 1fr);
		gap: 2px;
		z-index: 0;
		overflow: hidden;
	}
	.poster-cell {
		position: relative;
		overflow: hidden;
		background: var(--poster-bg, #1a1a22);
	}
	.poster-cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.85;
	}
	.poster-grid-overlay {
		position: fixed;
		inset: 0;
		z-index: 1;
		background: linear-gradient(
			180deg,
			var(--bg, #0c0c0f) 0%,
			rgba(12, 12, 15, 0.92) 25%,
			rgba(12, 12, 15, 0.88) 50%,
			rgba(12, 12, 15, 0.92) 75%,
			var(--bg, #0c0c0f) 100%
		);
		pointer-events: none;
	}
	@media (max-width: 768px) {
		.poster-grid {
			grid-template-columns: repeat(4, 1fr);
			grid-template-rows: repeat(6, 1fr);
		}
	}
</style>
