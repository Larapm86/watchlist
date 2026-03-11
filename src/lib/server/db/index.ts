import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
// Load .env from project root (works when CLI runs from any cwd)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
	if (_db) return _db;
	const rawUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
	if (!rawUrl) {
		throw new Error(
			'DATABASE_URL is not set. Add it to your .env file (see README → Database).'
		);
	}
	if (rawUrl.includes('user:password@host:port')) {
		throw new Error(
			'DATABASE_URL is still the placeholder. Update your .env file with your real Neon (or other Postgres) connection string (see README → Database).'
		);
	}
	const databaseUrl = rawUrl
		.replace(/^postgresql:\/\//i, 'postgres://')
		.replace(/\?.*$/, (query) => {
			const params = new URLSearchParams(query.slice(1));
			params.delete('channel_binding');
			const qs = params.toString();
			return qs ? `?${qs}` : '';
		});
	const client = neon(databaseUrl);
	_db = drizzle(client, { schema });
	return _db;
}

/** Lazy-initialized so the app can start and show a clear error page if DB is missing. */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_, prop) {
		return (getDb() as Record<string | symbol, unknown>)[prop];
	}
});
