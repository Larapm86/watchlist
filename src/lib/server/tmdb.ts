import { env } from '$env/dynamic/private';

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';

export interface TmdbSearchResult {
	poster_path: string | null;
	overview?: string | null;
	[key: string]: unknown;
}

export interface TmdbSearchResponse {
	results?: TmdbSearchResult[];
}

export interface TmdbMovieDetails {
	posterPath: string | null;
	overview: string | null;
}

/**
 * Search TMDB by movie title and return poster path and overview of the first result.
 */
export async function searchMovieDetails(title: string): Promise<TmdbMovieDetails> {
	const empty = { posterPath: null, overview: null };
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
	if (!firstWithPoster) return { posterPath: null, overview: null };
	const posterPath = String(firstWithPoster.poster_path);
	const overview =
		firstWithPoster.overview != null && String(firstWithPoster.overview).trim() !== ''
			? String(firstWithPoster.overview).trim()
			: null;
	return { posterPath, overview };
}
