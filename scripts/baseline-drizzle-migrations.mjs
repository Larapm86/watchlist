/**
 * One-time baseline: mark migrations 0000–0002 as already applied
 * so "pnpm db:migrate" only runs 0003 (poster_path).
 * Run this if you get "relation \"watchlist\" already exists" when running db:migrate.
 *
 * Usage: node scripts/baseline-drizzle-migrations.mjs
 * Then: pnpm db:migrate
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env from project root
const envPath = join(root, '.env');
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  // .env optional
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = `
CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '0002_baseline', 1773075578836
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1773075578836
);
`;

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query(sql);
  console.log('Baseline applied. Run: pnpm db:migrate');
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
