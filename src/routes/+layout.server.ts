import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { watchlist } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user ?? null;
	if (!user) {
		return { user: null, watchlistStats: null };
	}

	try {
		let rows: { watchedAt: Date | null; rating: string | null; genre: string | null; runtime?: number | null }[];
		try {
			rows = await db
				.select({
					watchedAt: watchlist.watchedAt,
					rating: watchlist.rating,
					genre: watchlist.genre,
					runtime: watchlist.runtime
				})
				.from(watchlist)
				.where(eq(watchlist.userId, user.id));
		} catch {
			// Fallback when runtime column doesn't exist yet (migration not run)
			rows = await db
				.select({
					watchedAt: watchlist.watchedAt,
					rating: watchlist.rating,
					genre: watchlist.genre
				})
				.from(watchlist)
				.where(eq(watchlist.userId, user.id));
			rows = rows.map((r) => ({ ...r, runtime: null }));
		}

		const now = new Date();
		const thisYear = now.getFullYear();
		const thisMonth = now.getMonth();
		let moviesWatched = 0;
		let inWatchlist = 0;
		let watchedThisMonth = 0;
		let watchedThisYear = 0;
		let ratingSum = 0;
		let ratingCount = 0;
		let totalRuntimeMinutes = 0;
		const genreCounts: Record<string, number> = {};
		const recentGenres: string[] = [];
		const RECENT_N = 10;

		for (const row of rows) {
			const watched = row.watchedAt != null;
			if (watched) {
				moviesWatched++;
				const d = row.watchedAt instanceof Date ? row.watchedAt : new Date(row.watchedAt);
				if (d.getFullYear() === thisYear) watchedThisYear++;
				if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) watchedThisMonth++;
				if (typeof row.runtime === 'number' && row.runtime > 0) totalRuntimeMinutes += row.runtime;
				const r = row.rating != null ? String(row.rating).trim() : '';
				if (['1', '2', '3', '4', '5'].includes(r)) {
					ratingSum += parseInt(r, 10);
					ratingCount++;
				}
				const g = row.genre?.trim();
				if (g) {
					for (const part of g.split(/\s*,\s*/)) {
						const p = part.trim();
						if (p) genreCounts[p] = (genreCounts[p] ?? 0) + 1;
					}
					recentGenres.push(g);
				}
			} else {
				inWatchlist++;
			}
		}

		const averageRating = ratingCount > 0 ? ratingSum / ratingCount : null;
		const monthsSoFar = Math.max(1, now.getMonth() + 1);
		const pacePerMonth = watchedThisYear > 0 ? (watchedThisYear / monthsSoFar).toFixed(1) : null;

		let criticStyle: string | null = null;
		if (averageRating != null) {
			if (averageRating <= 2.2) criticStyle = 'Selective — you know what you like';
			else if (averageRating >= 4) criticStyle = 'Generous — you find something to like in most';
			else criticStyle = 'Balanced — fair and even';
		}

		const lastGenres = recentGenres.slice(-RECENT_N).flatMap((s) => s.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean));
		const genreFreq: Record<string, number> = {};
		for (const g of lastGenres) genreFreq[g] = (genreFreq[g] ?? 0) + 1;
		let moodPhase: string | null = null;
		let maxCount = 0;
		for (const [genre, count] of Object.entries(genreFreq)) {
			if (count > maxCount) {
				maxCount = count;
				moodPhase = genre;
			}
		}
		if (moodPhase) moodPhase = `You're in a ${moodPhase} phase`;

		const formatRuntime = (mins: number) => {
			if (mins < 60) return `${mins} min`;
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return m > 0 ? `${h}h ${m}m` : `${h}h`;
		};

		return {
			user,
			watchlistStats: {
				moviesWatched,
				inWatchlist,
				watchedThisMonth,
				watchedThisYear,
				averageRating: averageRating != null ? Math.round(averageRating * 10) / 10 : null,
				totalRuntimeMinutes,
				totalRuntimeFormatted: totalRuntimeMinutes > 0 ? formatRuntime(totalRuntimeMinutes) : null,
				pacePerMonth,
				criticStyle,
				moodPhase
			}
		};
	} catch {
		// On error (e.g. DB unavailable), still show stats section with zeros so it's visible
		return {
			user,
			watchlistStats: {
				moviesWatched: 0,
				inWatchlist: 0,
				watchedThisMonth: 0,
				watchedThisYear: 0,
				averageRating: null,
				totalRuntimeMinutes: 0,
				totalRuntimeFormatted: null,
				pacePerMonth: null,
				criticStyle: null,
				moodPhase: null
			}
		};
	}
};
