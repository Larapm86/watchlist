-- One-time baseline: mark migrations 0000–0002 as already applied
-- so "pnpm db:migrate" only runs 0003 (poster_path).
-- Run this if you get "relation \"watchlist\" already exists" when running db:migrate.
-- Usage: psql "$DATABASE_URL" -f drizzle/baseline_before_0003.sql
-- Or: pnpm db:baseline (then pnpm db:migrate)

CREATE SCHEMA IF NOT EXISTS drizzle;

CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

-- When created_at = 1773075578836 (0002's timestamp), migrator will only run 0003
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
SELECT '0002_baseline', 1773075578836
WHERE NOT EXISTS (
  SELECT 1 FROM drizzle.__drizzle_migrations WHERE created_at = 1773075578836
);
