<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	<header class="header">
		<div class="brand">
			<a href="/" class="logo">Kinoline</a>
			<span class="tagline">Curate. Queue. Watch.</span>
		</div>
		{#if data.user}
			<div class="user-row">
				<span class="user-label" title={data.user.email}>
					{data.user.name?.trim() || data.user.email}
				</span>
				<form method="post" action="/demo/better-auth?/signOut" class="sign-out-form">
					<button type="submit" class="sign-out-btn" title="Sign out">
						Sign out
					</button>
				</form>
			</div>
		{:else}
			<a href="/demo/better-auth/login" class="login-link">Log in</a>
		{/if}
	</header>

	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		font-size: 1rem;
		line-height: 1.5;
		color: var(--text);
		background: var(--bg);
		-webkit-font-smoothing: antialiased;
	}

	:global(html) {
		color-scheme: light dark;
		--bg: #f5f5f5;
		--text: #1a1a1a;
		--text-muted: #444;
		--border: #e5e5e5;
		--input-bg: #fff;
		--input-border: #ccc;
		--card-bg: #fff;
		--btn-primary-bg: #1a1a1a;
		--btn-primary-hover: #333;
		--link: #0066cc;
		--focus-ring: rgba(0, 102, 204, 0.2);
		--error: #c00;
	}

	@media (prefers-color-scheme: dark) {
		:global(html) {
			--bg: #1a1a1a;
			--text: #e5e5e5;
			--text-muted: #a0a0a0;
			--border: #333;
			--input-bg: #2a2a2a;
			--input-border: #444;
			--card-bg: #242424;
			--btn-primary-bg: #e5e5e5;
			--btn-primary-hover: #fff;
			--link: #6eb3f7;
			--focus-ring: rgba(110, 179, 247, 0.3);
			--error: #f66;
		}
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
	}

	.app {
		max-width: 36rem;
		margin: 0 auto;
		min-height: 100vh;
		padding: 0 1.5rem 2rem;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.25rem 0 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
		letter-spacing: -0.02em;
	}

	.logo:hover {
		text-decoration: none;
		opacity: 0.85;
	}

	.tagline {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.02em;
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 1;
		min-width: 0;
	}

	.user-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sign-out-form {
		flex-shrink: 0;
	}

	.sign-out-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0 !important;
		padding: 0.375rem 0.75rem !important;
		font-size: 0.875rem !important;
		background: transparent !important;
		color: var(--text-muted) !important;
		border: 1px solid var(--border) !important;
		border-radius: 6px !important;
	}

	.sign-out-btn:hover {
		background: var(--border) !important;
		color: var(--text) !important;
	}

	.login-link {
		font-size: 0.9375rem;
		color: var(--link);
		text-decoration: none;
	}

	.login-link:hover {
		text-decoration: underline;
	}

	.main {
		padding-top: 1.5rem;
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
		color: var(--card-bg);
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	:global(button:hover) {
		background: var(--btn-primary-hover);
	}

	:global(.form-error) {
		font-size: 0.875rem;
		color: var(--error);
		margin: 0.5rem 0 0;
	}
</style>
