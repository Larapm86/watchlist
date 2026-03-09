<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let mode = $state<'login' | 'register'>('login');
</script>

<div class="auth-page">
	<div class="auth-card">
		<h1 class="auth-title">Kinoline</h1>
		<p class="auth-tagline">Log in or create an account to curate your watchlist.</p>

		<form method="post" action={mode === 'login' ? '?/signInEmail' : '?/signUpEmail'} use:enhance class="auth-form">
			<label class="auth-label">
				<span class="auth-label-text">Email</span>
				<input
					type="email"
					name="email"
					autocomplete="email"
					required
					class="auth-input"
					placeholder="you@example.com"
				/>
			</label>

			<label class="auth-label">
				<span class="auth-label-text">Password</span>
				<input
					type="password"
					name="password"
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
					required
					class="auth-input"
					placeholder="••••••••"
				/>
			</label>

			{#if mode === 'register'}
				<label class="auth-label">
					<span class="auth-label-text">Name</span>
					<input
						type="text"
						name="name"
						autocomplete="name"
						class="auth-input"
						placeholder="Your name"
					/>
				</label>
			{/if}

			{#if form?.message}
				<p class="auth-error" role="alert">{form.message}</p>
			{/if}

			<div class="auth-actions">
				<button type="submit" class="auth-btn auth-btn-primary">
					{mode === 'login' ? 'Log in' : 'Create account'}
				</button>
				<button
					type="button"
					class="auth-btn auth-btn-ghost"
					onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
				>
					{mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.auth-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100%;
		padding: 2rem 1rem;
	}

	.auth-card {
		width: 100%;
		max-width: 400px;
		padding: 2rem;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	.auth-title {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		text-align: center;
		margin: 0 0 0.25rem;
		color: #fff;
		text-shadow:
			0 0 4px #fff,
			0 0 8px var(--neon-blue),
			0 0 12px var(--neon-blue),
			0 0 24px var(--neon-blue);
	}

	.auth-tagline {
		font-size: 0.9375rem;
		color: var(--text-muted);
		text-align: center;
		margin: 0 0 1.75rem;
		line-height: 1.4;
	}

	.auth-form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.auth-label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.auth-label-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text);
	}

	.auth-input {
		width: 100%;
		height: 44px;
		margin: 0;
		padding: 0 0.75rem;
		font-size: 0.9375rem;
		font-family: inherit;
		color: var(--text);
		background: var(--input-bg);
		border: 1px solid var(--border);
		border-radius: 10px;
		box-sizing: border-box;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.auth-input::placeholder {
		color: var(--text-muted);
	}

	.auth-input:hover {
		border-color: var(--input-border);
	}

	.auth-input:focus {
		outline: none;
		border-color: var(--link);
		box-shadow: 0 0 0 2px var(--focus-ring);
	}

	.auth-error {
		margin: 0;
		font-size: 0.875rem;
		color: var(--error);
		padding: 0.5rem 0;
	}

	.auth-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.auth-btn {
		width: 100%;
		height: 44px;
		margin: 0;
		padding: 0 1rem;
		font-size: 0.9375rem;
		font-weight: 600;
		font-family: inherit;
		line-height: 1;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
		box-sizing: border-box;
		border: 1px solid transparent;
	}

	.auth-btn-primary {
		background: var(--btn-primary-bg);
		color: var(--card-bg);
	}

	.auth-btn-primary:hover {
		background: var(--btn-primary-hover);
	}

	.auth-btn-primary:focus-visible {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}

	.auth-btn-ghost {
		background: transparent;
		color: var(--link);
		border-color: var(--border);
	}

	.auth-btn-ghost:hover {
		background: var(--float-menu-input-bg);
		border-color: var(--input-border);
	}

	.auth-btn-ghost:focus-visible {
		outline: 2px solid var(--link);
		outline-offset: 2px;
	}
</style>
