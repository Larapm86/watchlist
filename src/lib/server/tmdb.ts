import { env } from '$env/dynamic/private';

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';

export interface TmdbSearchResult {
	poster_path: string | null;
	overview?: string | null;
	release_date?: string | null;
	genre_ids?: number[];
	[key: string]: unknown;
}

export interface TmdbSearchResponse {
	results?: TmdbSearchResult[];
}

export interface TmdbMovieDetails {
	posterPath: string | null;
	overview: string | null;
	genre: string | null;
	year: string | null;
	runtime: number | null; // minutes
}

/** TMDB movie genre ID to name (from https://api.themoviedb.org/3/genre/movie/list) */
const TMDB_MOVIE_GENRES: Record<number, string> = {
	28: 'Action',
	12: 'Adventure',
	16: 'Animation',
	35: 'Comedy',
	80: 'Crime',
	99: 'Documentary',
	18: 'Drama',
	10751: 'Family',
	14: 'Fantasy',
	36: 'History',
	27: 'Horror',
	10402: 'Music',
	9648: 'Mystery',
	10749: 'Romance',
	878: 'Sci-Fi',
	10770: 'TV Movie',
	53: 'Thriller',
	10752: 'War',
	37: 'Western'
};

function genreIdsToNames(genreIds: number[] | undefined): string | null {
	if (!Array.isArray(genreIds) || genreIds.length === 0) return null;
	const names = genreIds
		.map((id) => TMDB_MOVIE_GENRES[id])
		.filter(Boolean)
		.slice(0, 3);
	return names.length > 0 ? names.join(', ') : null;
}

function releaseDateToYear(releaseDate: string | null | undefined): string | null {
	if (!releaseDate || typeof releaseDate !== 'string') return null;
	const trimmed = releaseDate.trim();
	if (trimmed.length >= 4) return trimmed.slice(0, 4);
	return null;
}

const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';

async function fetchMovieRuntime(
	movieId: number,
	key: string,
	isReadAccessToken: boolean
): Promise<number | null> {
	const url = `${TMDB_MOVIE_URL}/${movieId}`;
	const res = await fetch(
		url + (isReadAccessToken ? '' : `?api_key=${key}`),
		isReadAccessToken ? { headers: { Authorization: `Bearer ${key}` } } : undefined
	);
	if (!res.ok) return null;
	const data = (await res.json()) as { runtime?: number };
	const rt = data?.runtime;
	return typeof rt === 'number' && rt > 0 ? rt : null;
}

/**
 * Search TMDB by movie title and return poster path, overview, genre, year and runtime of the first result.
 */
export async function searchMovieDetails(title: string): Promise<TmdbMovieDetails> {
	const empty = { posterPath: null, overview: null, genre: null, year: null, runtime: null };
	const key = (env.TMDB_API_KEY ?? process.env.TMDB_API_KEY)?.trim();
	if (!key) return empty;

	const url = new URL(TMDB_SEARCH_URL);
	url.searchParams.set('query', title.trim());

	const isReadAccessToken = key.includes('.') && key.length > 40;
	if (!isReadAccessToken) {
		url.searchParams.set('api_key', key);
	}
	const res = await fetch(url.toString(), isReadAccessToken ? { headers: { Authorization: `Bearer ${key}` } } : undefined);
	if (!res.ok) return empty;

	const data = (await res.json()) as TmdbSearchResponse;
	const results = data?.results;
	if (!Array.isArray(results) || results.length === 0) return empty;

	const firstWithPoster = results.find((r) => r?.poster_path != null && String(r.poster_path).trim() !== '');
	if (!firstWithPoster) return empty;
	const posterPath = String(firstWithPoster.poster_path);
	const overview =
		firstWithPoster.overview != null && String(firstWithPoster.overview).trim() !== ''
			? String(firstWithPoster.overview).trim()
			: null;
	const genre = genreIdsToNames(firstWithPoster.genre_ids);
	const year = releaseDateToYear(firstWithPoster.release_date);
	const movieId = typeof firstWithPoster.id === 'number' ? firstWithPoster.id : null;
	const runtime = movieId != null ? await fetchMovieRuntime(movieId, key, isReadAccessToken) : null;
	return { posterPath, overview, genre, year, runtime };
}
