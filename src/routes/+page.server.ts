import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { watchlist } from '$lib/server/db/schema';
import { searchMovieDetails } from '$lib/server/tmdb';
import { and, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const user = event.locals.user ?? null;
	if (!user) {
		return { user: null, watchlist: [] };
	}

	try {
		// Explicit select so result shape is predictable (Neon/driver can return snake_case)
		const items = await db
			.select({
				id: watchlist.id,
				userId: watchlist.userId,
				title: watchlist.title,
				posterPath: watchlist.posterPath,
				overview: watchlist.overview,
				genre: watchlist.genre,
				year: watchlist.year,
				createdAt: watchlist.createdAt,
				watchedAt: watchlist.watchedAt,
				rating: watchlist.rating,
				runtime: watchlist.runtime
			})
			.from(watchlist)
			.where(eq(watchlist.userId, user.id))
			.orderBy(desc(watchlist.createdAt));

		// Normalize: support both camelCase (Drizzle) and snake_case (raw driver)
		function str(row: Record<string, unknown>, ...keys: string[]): string | null {
			for (const k of keys) {
				const v = row[k];
				if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
			}
			return null;
		}
		function num(row: Record<string, unknown>, ...keys: string[]): number | null {
			for (const k of keys) {
				const v = row[k];
				if (v === undefined || v === null) continue;
				const n = typeof v === 'number' ? v : parseInt(String(v), 10);
				if (!Number.isNaN(n)) return n;
			}
			return null;
		}
		function date(row: Record<string, unknown>, ...keys: string[]): Date | null {
			for (const k of keys) {
				const v = row[k];
				if (v instanceof Date) return v;
				if (v !== undefined && v !== null && String(v).trim() !== '') {
					const d = new Date(String(v));
					if (!Number.isNaN(d.getTime())) return d;
				}
			}
			return null;
		}

		const watchlistData = items.map((row: Record<string, unknown>) => ({
			id: num(row, 'id') ?? Number(row.id ?? 0),
			userId: str(row, 'userId', 'user_id') ?? String(row.userId ?? row.user_id ?? ''),
			title: str(row, 'title') ?? String(row.title ?? ''),
			posterPath: str(row, 'posterPath', 'poster_path') ?? null,
			overview: str(row, 'overview') ?? null,
			genre: str(row, 'genre') ?? null,
			year: str(row, 'year') ?? null,
			createdAt: date(row, 'createdAt', 'created_at') ?? (row.createdAt ?? row.created_at as Date) ?? new Date(),
			watchedAt: date(row, 'watchedAt', 'watched_at') ?? null,
			rating: str(row, 'rating') ?? (row.rating as string | null) ?? null,
			runtime: num(row, 'runtime') ?? (row.runtime as number | null) ?? null
		}));

		return { user, watchlist: watchlistData };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const lower = msg.toLowerCase();
		if (lower.includes('column') || lower.includes('poster_path') || lower.includes('watched_at') || lower.includes('rating') || lower.includes('runtime') || lower.includes('schema') || lower.includes('relation') || lower.includes('does not exist')) {
			throw new Error(
				'Database schema is out of date or missing. Run: pnpm db:migrate (or pnpm db:push) and ensure DATABASE_URL in .env is correct.'
			);
		}
		if (lower.includes('connection') || lower.includes('econnrefused') || lower.includes('timeout') || lower.includes('database')) {
			throw new Error(
				'Cannot connect to the database. Check DATABASE_URL in .env and that the database is running.'
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
				year: details.year ?? null,
				runtime: details.runtime ?? null
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			if (msg.includes('column') || msg.includes('schema')) {
				return fail(422, {
					message: 'Database schema out of date. Run: pnpm db:migrate'
				});
			}
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
