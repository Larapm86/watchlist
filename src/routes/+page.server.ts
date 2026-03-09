import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { watchlist } from '$lib/server/db/schema';
import { searchMovieDetails } from '$lib/server/tmdb';
import { and, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user;
	if (!user) {
		redirect(302, '/demo/better-auth/login');
	}

	try {
		const items = await db
			.select()
			.from(watchlist)
			.where(eq(watchlist.userId, user.id))
			.orderBy(desc(watchlist.createdAt));

		// Normalize so client always gets posterPath and overview (camelCase)
		const watchlistData = items.map((row) => {
			const r = row as { poster_path?: string | null; overview?: string | null };
			return {
				...row,
				posterPath: row.posterPath ?? r.poster_path ?? null,
				overview: row.overview ?? r.overview ?? null
			};
		});

		return { watchlist: watchlistData };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('watched_at') || msg.includes('column')) {
			throw new Error(
				'Database schema is out of date. Run: pnpm db:push (then choose Yes to add the watched_at column).'
			);
		}
		throw err;
	}
};

export const actions: Actions = {
	add: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const title = formData.get('title')?.toString()?.trim();
		if (!title) {
			return fail(400, { message: 'Title is required' });
		}

		const details = await searchMovieDetails(title);

		await db.insert(watchlist).values({
			userId: user.id,
			title,
			posterPath: details.posterPath ?? null,
			overview: details.overview ?? null
		});

		return {};
	},
	delete: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id');
		const parsed = typeof id === 'string' ? parseInt(id, 10) : NaN;
		if (Number.isNaN(parsed) || parsed < 1) {
			return fail(400, { message: 'Invalid item' });
		}

		await db
			.delete(watchlist)
			.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));

		return {};
	},
	markWatched: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id');
		const parsed = typeof id === 'string' ? parseInt(id, 10) : NaN;
		if (Number.isNaN(parsed) || parsed < 1) {
			return fail(400, { message: 'Invalid item' });
		}

		try {
			await db
				.update(watchlist)
				.set({ watchedAt: new Date() })
				.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('watched_at') || msg.includes('column')) {
				return fail(500, {
					message: 'Database missing watched_at column. Run: pnpm db:push'
				});
			}
			return fail(500, { message: 'Could not update movie.' });
		}

		return {};
	},
	unmarkWatched: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id');
		const parsed = typeof id === 'string' ? parseInt(id, 10) : NaN;
		if (Number.isNaN(parsed) || parsed < 1) {
			return fail(400, { message: 'Invalid item' });
		}

		try {
			await db
				.update(watchlist)
				.set({ watchedAt: null })
				.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('watched_at') || msg.includes('column')) {
				return fail(500, {
					message: 'Database missing watched_at column. Run: pnpm db:push'
				});
			}
			return fail(500, { message: 'Could not update movie.' });
		}

		return {};
	}
};
