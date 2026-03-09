import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Load .env from project root (works when CLI runs from any cwd)
const __dirname = dirname(fileURLToPath(import.meta.url));
// From src/lib/server/db go up 4 levels to project root
config({ path: resolve(__dirname, '../../../../.env') });

const rawUrl = process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!rawUrl) throw new Error('DATABASE_URL is not set');
if (rawUrl.includes('user:password@host:port')) {
	throw new Error(
		'DATABASE_URL is still the placeholder. Update your .env file with your real Neon (or other Postgres) connection string and save the file.'
	);
}

// Neon driver expects postgres:// and can choke on params like channel_binding=require
const databaseUrl = rawUrl
	.replace(/^postgresql:\/\//i, 'postgres://')
	.replace(/\?.*$/, (query) => {
		const params = new URLSearchParams(query.slice(1));
		params.delete('channel_binding');
		const qs = params.toString();
		return qs ? `?${qs}` : '';
	});

const client = neon(databaseUrl);

export const db = drizzle(client, { schema });
