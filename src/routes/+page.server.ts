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

		// Map rows to camelCase; Neon/driver may return snake_case column names
		function str(row: Record<string, unknown>, ...keys: string[]): string | null {
			for (const k of keys) {
				const v = row[k];
				if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
			}
			return null;
		}
		const watchlistData = items.map((row: Record<string, unknown>) => ({
			id: row.id as number,
			userId: (row.userId ?? row.user_id) as string,
			title: String(row.title ?? ''),
			posterPath: str(row, 'posterPath', 'poster_path'),
			overview: str(row, 'overview'),
			genre: str(row, 'genre'),
			year: str(row, 'year'),
			createdAt: row.createdAt ?? row.created_at,
			watchedAt: row.watchedAt ?? row.watched_at ?? null,
			rating: (row.rating ?? null) as string | null
		}));

		return { watchlist: watchlistData };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('watched_at') || msg.includes('rating') || msg.includes('column')) {
			throw new Error(
				'Database schema is out of date. Run: pnpm db:migrate (or pnpm db:push) to add missing columns (e.g. watched_at, rating).'
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

		try {
			const details = await searchMovieDetails(title);
			await db.insert(watchlist).values({
				userId: user.id,
				title,
				posterPath: details.posterPath ?? null,
				overview: details.overview ?? null,
				genre: details.genre ?? null,
				year: details.year ?? null
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('column') || msg.includes('schema')) {
				return fail(422, {
					message: 'Database schema out of date. Run: pnpm db:migrate'
				});
			}
			// TMDB or network error – return 422 so client gets message, not error page
			return fail(422, {
				message: 'Could not add movie. Check the title or try again later.'
			});
		}

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

		try {
			await db
				.delete(watchlist)
				.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));
		} catch (err) {
			return fail(422, { message: 'Could not remove movie. Try again.' });
		}

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
				return fail(422, {
					message: 'Database missing watched_at column. Run: pnpm db:push'
				});
			}
			return fail(422, { message: 'Could not update movie.' });
		}

		return {};
	},
	setRating: async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401, { message: 'Not logged in' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id');
		const rating = formData.get('rating')?.toString();
		const parsed = typeof id === 'string' ? parseInt(id, 10) : NaN;
		if (Number.isNaN(parsed) || parsed < 1) {
			return fail(400, { message: 'Invalid item' });
		}
		if (!rating || !['1', '2', '3', '4', '5'].includes(rating)) {
			return fail(400, { message: 'Invalid rating' });
		}

		try {
			await db
				.update(watchlist)
				.set({ rating })
				.where(and(eq(watchlist.id, parsed), eq(watchlist.userId, user.id)));
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('rating') || msg.includes('column')) {
				return fail(422, {
					message: 'Database missing rating column. Run: pnpm db:migrate or pnpm db:push'
				});
			}
			return fail(422, { message: 'Could not save rating.' });
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
				return fail(422, {
					message: 'Database missing watched_at column. Run: pnpm db:push'
				});
			}
			return fail(422, { message: 'Could not update movie.' });
		}

		return {};
	}
};
