# Migrations

If you get **"relation \"watchlist\" already exists"** when running `pnpm db:migrate` (because the DB was created with `db:push` and the migrations journal is empty), run the one-time baseline so only the latest migration runs:

1. **`pnpm install`** (if you added the `pg` dependency)
2. **`pnpm db:baseline`** — marks migrations 0000–0002 as applied
3. **`pnpm db:migrate`** — runs only 0003 (adds `poster_path`)

Alternatively, run the SQL by hand (e.g. in your DB client or `psql "$DATABASE_URL" -f drizzle/baseline_before_0003.sql`), then run `pnpm db:migrate`.
