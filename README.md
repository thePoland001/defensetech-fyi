# defensetech.fyi

Anonymous salaries, clearance requirements and intern clearance sponsorship for the defense companies of Huntsville, Alabama. Think levels.fyi, but for the Rocket City.

- **~300 companies** with a Huntsville address (33 large / primes, 55 mid-size, 214 small), compiled from the Huntsville/Madison County Chamber directory, the Cummings Research Park tenant directory and local business news.
- **Give-to-get:** company profiles and clearance stats are public. Individual salaries and pay medians unlock after a visitor submits one salary. The server enforces this with a signed, httpOnly cookie, so locked visitors never receive pay data.
- **Defense-specific fields:** required clearance level, whether the company sponsored it, intern clearance sponsorship, 9/80 schedules, Redstone Arsenal vs. Research Park.
- **Posted pay ranges** from public Huntsville job postings appear on company pages, and **BLS wage percentiles** for the Huntsville metro appear when you filter salaries by title. Both follow the same give-to-get gate. See [`data-pipeline/`](data-pipeline/README.md) for how that data is collected.
- **Baseline estimates** pre-populate the large employers (Lockheed, Northrop, Boeing, RTX, Leidos/Dynetics, L3Harris, Palantir, Anduril…). They're always labeled "Estimate" in the UI and can be filtered out.

## Stack

- **API:** Node 20+, Express, Postgres (`pg`). With no `DATABASE_URL` it falls back to embedded [PGlite](https://pglite.dev) on disk, so local dev needs zero setup.
- **Web:** React 18 + React Router, built with Vite and served by the same Express process.

## Run locally

```bash
npm install
npm run dev      # API on :3001, Vite on :5173 (proxies /api)
```

Or production-style:

```bash
npm run build && npm start   # http://localhost:3001
```

## Database

Production uses a regular Postgres database through `DATABASE_URL`. Locally, with no `DATABASE_URL`, the app uses embedded PGlite in `./.data`, so there's nothing to set up.

**Recommended host: [Neon](https://neon.tech) (free tier).** Render's own free Postgres is deleted after 30 days, and the free web service's disk is wiped on every deploy. Neon's free plan doesn't expire and has room for far more salaries than this site will collect. To set it up:

1. Create a Neon project.
2. Copy the connection string (`postgresql://…neon.tech/…?sslmode=require`).
3. Paste it as `DATABASE_URL` in Render.

Any Postgres 14+ works the same way, for example Render's paid Postgres or Supabase.

What the app does with the database:

- **Migrations:** `server/db.js` keeps an append-only list of schema migrations and applies any new ones on boot. The current version is stored in `meta.schema_version`.
- **Startup guard:** in production the server refuses to start without `DATABASE_URL`, so it can never quietly save submissions to a disk that gets wiped.
- **Estimates:** baseline estimates are regenerated from code whenever `ESTIMATES_VERSION` changes, in a single transaction. Community submissions are never touched.
- **Unlock cookies:** these are tied to the specific database. If the database is ever replaced, old cookies stop unlocking and visitors are asked to contribute again.

### Backups

Everything that can't be regenerated from code is the community salaries, community-added companies and reports. You can back these up in two ways:

- **From the browser:** open `/admin` and click **Download backup**.
- **From a terminal**, with `DATABASE_URL` set:

  ```bash
  npm run db:backup                       # → backups/defensetech-YYYY-MM-DD.json
  npm run db:restore backups/defensetech-YYYY-MM-DD.json
  ```

Restoring is safe to repeat: entries that are already present are skipped. You can also use it to move to a new database host.

## Moderation

- **Reports:** every community entry has a **Report** link. Reports from three different people hide the entry until it's reviewed.
- **Admin page:** `/admin` isn't linked anywhere on the site. Sign in with the `ADMIN_TOKEN` environment variable. From there you can approve, hide or delete entries, remove junk community-added companies, and download backups.
- **Deleting your own entry:** contributors can delete their own submission from the About page, in the same browser they submitted from.

## Deploy to Render

The repo includes a `render.yaml` Blueprint.

1. In Render, choose **New → Blueprint** and select this repo.
2. When Render asks for `DATABASE_URL`, paste your Neon connection string. Render generates `SESSION_SECRET` and `ADMIN_TOKEN` itself; you'll find `ADMIN_TOKEN` under the service's **Environment** tab.
3. On first boot the server runs migrations, loads the company directory and seeds the baseline estimates.

The free web service sleeps after 15 minutes without traffic, so the first visit after that takes 30–60 seconds.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Required in production. If unset in development, the app uses embedded PGlite in `./.data`. |
| `SESSION_SECRET` | Signs unlock cookies and salts IP hashes. Required in production. |
| `ADMIN_TOKEN` | Enables `/admin` and the admin API. If unset, both are disabled. |
| `DATABASE_SSL` | Optional `true`/`false` override. By default SSL is used for external hostnames. |
| `DATABASE_POOL_MAX` | Optional connection pool size (default 5). |
| `PORT` | Set by Render. Defaults to 3001. |

## Project layout

```
server/
  index.js            Express API + static hosting
  db.js               Postgres/PGlite, migrations, transactions, seeding
  moderation.js       Reports, delete-my-submission, admin API, backup export
  token.js            Signed unlock cookie
  data/companies.js   Huntsville company directory
  data/estimates.js   Baseline estimate generator for large companies
  data/market.json    Posted ranges + BLS benchmarks (generated by data-pipeline/build.mjs)
  market.js           Serves market.json behind the unlock gate
data-pipeline/        Scripts and raw sources for market.json
scripts/              db-backup.mjs / db-restore.mjs
shared/options.js     Titles, levels, clearance options (used by API + UI)
client/               React app (Vite root)
```

## Editing data

- **Add or fix a company:** edit `server/data/companies.js`. Rows are upserted by slug on every boot.
- **Change estimates:** edit `server/data/estimates.js` and bump `ESTIMATES_VERSION`. Old estimates are replaced on the next boot, and user submissions are never touched.
- **Remove a bad submission:** `DELETE FROM salaries WHERE id = …;` in the Render Postgres shell.
