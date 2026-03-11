# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.12.5 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright sveltekit-adapter="adapter:netlify" drizzle="database:postgresql+postgresql:neon" better-auth="demo:password" --install pnpm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Database

The app uses PostgreSQL (e.g. [Neon](https://neon.tech)) and Drizzle. If the database is not working:

1. **Create `.env`** from the example:
   ```sh
   cp .env.example .env
   ```

2. **Set `DATABASE_URL`** in `.env` to a real Postgres connection string:
   - **Neon (free tier):** create a project at [neon.tech](https://neon.tech), copy the connection string, and use `postgres://...` (not `postgresql://`) with `?sslmode=require` only if needed.
   - **Local Postgres:** e.g. `postgres://user:password@localhost:5432/watchlist`

   If you leave the placeholder `user:password@host:port`, the app will refuse to start and tell you to update it.

3. **Apply the schema** so tables exist:
   ```sh
   pnpm db:push
   ```
   Or run migrations: `pnpm db:migrate`

4. **Auth (optional):** For sign-in/sign-up, set `BETTER_AUTH_SECRET` (e.g. a long random string) and `ORIGIN` (your app URL, e.g. `http://localhost:5173`) in `.env`.

5. **Movie posters and details:** To load poster images and movie info (overview, genre, year), set `TMDB_API_KEY` in `.env`. Get a free API key at [The Movie Database](https://www.themoviedb.org/settings/api). Without it, movies are still added with the title you type, but the VHS case will show no poster and no extra details.

If you see "Database schema is out of date" or "Cannot connect to the database", follow the steps above and ensure the database is running and reachable.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
