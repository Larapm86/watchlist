<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="page">
	<section class="add-form">
		<form method="post" action="?/add" use:enhance>
			<label for="title">Add movie</label>
			<div class="input-row">
				<input id="title" type="text" name="title" placeholder="Movie title" required />
				<button type="submit" title="Add movie">Add</button>
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
			<ul>
				{#each data.watchlist as item}
					<li class="list-item">
						<span class="title">{item.title}</span>
						<form method="post" action="?/delete" use:enhance class="delete-form">
							<input type="hidden" name="id" value={item.id} />
							<button type="submit" class="delete-btn" title="Remove from list">Remove</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.page {
		/* inherits from layout */
	}

	.add-form {
		margin-bottom: 2rem;
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
	}

	.list {
		background: var(--card-bg);
		border-radius: 8px;
		padding: 0 1rem;
		border: 1px solid var(--border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}

	@media (prefers-color-scheme: dark) {
		.list {
			box-shadow: none;
		}
	}

	.list-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.list-item .title {
		flex: 1;
		min-width: 0;
	}

	.delete-form {
		flex-shrink: 0;
	}

	.delete-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 0 !important;
		background: transparent !important;
		color: var(--text-muted) !important;
		font-size: 0.875rem !important;
		padding: 0.25rem 0.5rem !important;
		border: none !important;
	}

	.delete-btn:hover {
		background: var(--border) !important;
		color: var(--text) !important;
	}
</style>
