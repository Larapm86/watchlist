<script lang="ts">
	import { fly } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { showAuthLoadingScreen } from '$lib/stores/authLoading';
	import PosterGrid from './PosterGrid.svelte';

	let step = $state<'name' | 'full'>('name');
	let nameValue = $state('');
	let registerSubmitting = $state(false);

	function goToFull() {
		if (nameValue.trim()) step = 'full';
	}
</script>

<div class="landing">
	<PosterGrid />
	<div class="landing-content">
		<h1 class="landing-claim">Curate. Queue. Watch.</h1>
		<p class="landing-tagline">
			Track movies, build your watchlist, and never forget what to watch next.
		</p>
		<p class="landing-cta-text">Create an account to get started — it only takes a moment.</p>

		<form
			method="post"
			action="/demo/better-auth/login?/signUpEmail"
			use:enhance={() => {
				registerSubmitting = true;
				return async ({ result, update }) => {
					await update();
					if (result.type !== 'failure') {
						showAuthLoadingScreen.set(true);
						/* Layout loads data after overlay ends */
					} else {
						await invalidateAll();
					}
					registerSubmitting = false;
				};
			}}
			class="landing-form"
		>
			<div class="landing-form-step">
				<label class="landing-label">
					<span class="landing-label-text">Name</span>
					<input
						type="text"
						name="name"
						autocomplete="name"
						class="landing-input"
						placeholder="Your name"
						bind:value={nameValue}
						onblur={() => nameValue.trim() && (step = 'full')}
					/>
				</label>
				{#if step === 'name'}
					<button type="button" class="landing-btn landing-btn-continue" onclick={goToFull}>
						Continue
					</button>
				{/if}
			</div>

			<div class="landing-form-reveal-slot">
				{#if step === 'full'}
					<div class="landing-form-reveal">
						<div
							class="landing-form-reveal-row"
							in:fly={{ y: 10, duration: 440, delay: 0, easing: (t) => 1 - Math.pow(1 - t, 4) }}
							out:fly={{ y: 6, duration: 200, delay: 0, easing: (t) => t * t }}
						>
							<label class="landing-label">
								<span class="landing-label-text">Email</span>
								<input
									type="email"
									name="email"
									autocomplete="email"
									required
									class="landing-input"
									placeholder="you@example.com"
								/>
							</label>
						</div>
						<div
							class="landing-form-reveal-row"
							in:fly={{ y: 10, duration: 440, delay: 70, easing: (t) => 1 - Math.pow(1 - t, 4) }}
							out:fly={{ y: 6, duration: 200, delay: 0, easing: (t) => t * t }}
						>
							<label class="landing-label">
								<span class="landing-label-text">Password</span>
								<input
									type="password"
									name="password"
									autocomplete="new-password"
									required
									class="landing-input"
									placeholder="••••••••"
								/>
							</label>
						</div>
						<div
							class="landing-form-reveal-row"
							in:fly={{ y: 10, duration: 440, delay: 140, easing: (t) => 1 - Math.pow(1 - t, 4) }}
							out:fly={{ y: 6, duration: 200, delay: 0, easing: (t) => t * t }}
						>
							<button type="submit" class="landing-btn landing-btn-primary" disabled={registerSubmitting}>
								{registerSubmitting ? 'Creating account…' : 'Create account'}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</form>
	</div>
</div>

<style>
	/* Landing page
	   1. Layout (container, content)
	   2. Typography (claim, tagline, CTA text)
	   3. Form (layout, labels, inputs)
	   4. Buttons
	*/

	/* 1. Layout */
	.landing {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		box-sizing: border-box;
	}

	.landing-content {
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 420px;
		text-align: center;
		transform: translateY(-8vh);
	}

	/* 2. Typography */
	.landing-claim {
		font-size: clamp(2.25rem, 6vw, 3.5rem);
		font-weight: 600;
		letter-spacing: 0.02em;
		line-height: 1.15;
		margin: 0 0 1rem;
		color: var(--text);
		text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
	}

	.landing-tagline {
		font-size: 1.0625rem;
		color: var(--text-muted);
		line-height: 1.5;
		margin: 0 0 0.75rem;
	}

	.landing-cta-text {
		font-size: 0.9375rem;
		color: var(--text-muted);
		margin: 0 0 2rem;
		opacity: 0.95;
	}

	/* 3. Form */
	.landing-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		text-align: left;
	}

	.landing-form-step {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Reserve space so the form doesn't jump when email/password appear */
	.landing-form-reveal-slot {
		min-height: 220px;
	}

	.landing-form-reveal {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.landing-form-reveal-row {
		display: block;
	}

	.landing-label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.landing-label-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text);
	}

	.landing-input {
		width: 100%;
		height: 44px;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		font-family: inherit;
		color: var(--text);
		background: var(--modal-input-bg, var(--input-bg));
		border: 1px solid var(--modal-input-border, var(--border));
		border-radius: 10px;
		box-sizing: border-box;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.landing-input::placeholder {
		color: var(--text-muted);
	}

	.landing-input:focus {
		outline: none;
		border-color: var(--link);
		box-shadow: 0 0 0 2px var(--focus-ring);
	}

	/* 4. Buttons */
	.landing-btn {
		width: 100%;
		height: 44px;
		padding: 0 1rem;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		line-height: 1;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
		box-sizing: border-box;
		border: 1px solid transparent;
	}

	.landing-btn-continue {
		background: transparent;
		color: var(--link);
		border-color: var(--border);
	}

	.landing-btn-continue:hover {
		background: var(--surface-overlay-light);
		border-color: var(--input-border);
	}

	.landing-btn-primary {
		background: var(--btn-primary-bg);
		color: var(--btn-primary-text);
		border-color: var(--border);
	}

	.landing-btn-primary:hover:not(:disabled) {
		background: var(--btn-primary-hover);
	}

	.landing-btn-primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.landing-btn:focus-visible {
		outline: 3px solid var(--btn-primary-focus);
		outline-offset: 2px;
	}
</style>
