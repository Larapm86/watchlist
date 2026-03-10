<script lang="ts">
	interface Props {
		status?: number;
		error?: { message: string };
	}
	let { status = 500, error }: Props = $props();
	const msg = error?.message ?? 'Something went wrong';
	const isDatabaseError =
		msg.toLowerCase().includes('database') ||
		msg.toLowerCase().includes('schema') ||
		msg.toLowerCase().includes('connection') ||
		msg.toLowerCase().includes('econnrefused') ||
		msg.toLowerCase().includes('database_url');
</script>

<svelte:head>
	<title>{status} — Error</title>
</svelte:head>

<div class="error-page">
	<div class="error-card">
		<h1 class="error-title">{status}</h1>
		<p class="error-message">{msg}</p>

		{#if isDatabaseError}
			<div class="error-fix" role="region" aria-labelledby="db-fix-heading">
				<h2 id="db-fix-heading" class="error-fix-heading">Fix the database</h2>
				<ol class="error-fix-list">
					<li>Copy <code>.env.example</code> to <code>.env</code> and open <code>.env</code>.</li>
					<li>Set <code>DATABASE_URL</code> to a real Postgres connection string (e.g. from <a href="https://neon.tech" target="_blank" rel="noopener noreferrer">Neon</a> or your local Postgres). Use <code>postgres://...</code>.</li>
					<li>Apply the schema: run <code>pnpm db:push</code> (or <code>pnpm db:migrate</code>) in the project root.</li>
					<li>Restart the dev server.</li>
				</ol>
				<p class="error-fix-note">See the <strong>Database</strong> section in the project README for more detail.</p>
			</div>
		{/if}

		<a href="/" class="error-back">← Back to home</a>
	</div>
</div>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		box-sizing: border-box;
	}
	.error-card {
		max-width: 420px;
		width: 100%;
		padding: 2rem;
		background: var(--card-bg);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
	}
	.error-title {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		font-weight: 700;
		color: var(--text);
	}
	.error-message {
		margin: 0 0 1.5rem;
		font-size: 0.9375rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
	.error-fix {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--input-bg);
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	.error-fix-heading {
		margin: 0 0 0.75rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text);
	}
	.error-fix-list {
		margin: 0 0 0.75rem;
		padding-left: 1.25rem;
		font-size: 0.875rem;
		color: var(--text-muted);
		line-height: 1.6;
	}
	.error-fix-list li {
		margin-bottom: 0.35rem;
	}
	.error-fix-list code {
		font-size: 0.8125rem;
		background: rgba(0, 0, 0, 0.25);
		padding: 0.15em 0.4em;
		border-radius: 4px;
	}
	.error-fix-note {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-muted);
	}
	.error-back {
		display: inline-block;
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--link);
		text-decoration: none;
	}
	.error-back:hover {
		text-decoration: underline;
	}
</style>
