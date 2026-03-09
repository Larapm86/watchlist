<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<main>
	<h1>Watchlist</h1>

	<section class="add-form">
		<form method="post" action="?/add" use:enhance>
			<label for="title">Add movie</label>
			<input id="title" type="text" name="title" placeholder="Movie title" required />
			<button>Add</button>
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
					<li>{item.title}</li>
				{/each}
			</ul>
		{/if}
	</section>

	<footer class="nav">
		<a href="/demo/better-auth">Account</a>
	</footer>
</main>

<style>
	.add-form {
		margin-bottom: 2rem;
	}

	.empty {
		color: #666;
		font-size: 0.9375rem;
	}

	.list {
		background: #fff;
		border-radius: 8px;
		padding: 0 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}

	.nav {
		margin-top: 2.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e5e5;
		font-size: 0.875rem;
	}
</style>
