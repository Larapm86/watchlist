<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
	{@render children()}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		font-size: 1rem;
		line-height: 1.5;
		color: #1a1a1a;
		background: #f5f5f5;
		-webkit-font-smoothing: antialiased;
	}

	:global(body) {
		margin: 0;
		min-height: 100vh;
	}

	.app {
		max-width: 36rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		min-height: 100vh;
	}

	:global(h1) {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0 0 1.5rem;
		letter-spacing: -0.02em;
	}

	:global(h2) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
	}

	:global(p) {
		margin: 0 0 1rem;
		color: #444;
	}

	:global(a) {
		color: #0066cc;
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
		border-bottom: 1px solid #e5e5e5;
	}

	:global(li:last-child) {
		border-bottom: none;
	}

	:global(label) {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #555;
		margin-bottom: 0.375rem;
	}

	:global(input[type='text']) {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 1rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
	}

	:global(input[type='text']:focus) {
		outline: none;
		border-color: #0066cc;
		box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
	}

	:global(button) {
		font: inherit;
		font-size: 0.9375rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		margin-top: 0.75rem;
		background: #1a1a1a;
		color: #fff;
		border: none;
		border-radius: 6px;
		cursor: pointer;
	}

	:global(button:hover) {
		background: #333;
	}

	:global(.form-error) {
		font-size: 0.875rem;
		color: #c00;
		margin: 0.5rem 0 0;
	}
</style>
