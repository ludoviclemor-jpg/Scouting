# KV Mechelen Scouting Hub

KV Mechelen's internal, browser-based scouting platform: a home dashboard,
a searchable/filterable player database, dedicated "African Debutants"
discovery, per-player scouting profiles with SofaScore ratings, top
performers, shortlists with notes/status tracking, a synchronization
reports log, and a settings overview.

(Originally built as a generic "Football Scouting Dashboard" — see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for that base design — then
connected to the real Scoutastic API and rebranded for KV Mechelen. All
three phases are additive; nothing from an earlier phase was removed.)

Full technical write-up — architecture, database schema, and the Scoutastic
/ SofaScore API design — is in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Read that first if you're evaluating the design; this file is just setup.

The live Scoutastic connection and daily sync has its own write-up,
including an important caveat about the JSON field mapping not yet being
verified against a real response —
**[docs/SCOUTASTIC_INTEGRATION.md](docs/SCOUTASTIC_INTEGRATION.md)**.

**Want the live HTTPS URL, not just the code?** → if you're not a
developer, start with **[docs/GO_LIVE_GUIDE.md](docs/GO_LIVE_GUIDE.md)** —
extremely simple, click-by-click, ~15–20 minutes. For the fuller technical
reference, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Postgres for the
data layer everywhere — a real hosted Postgres in production, and
[PGlite](https://pglite.dev) (a genuine embedded/WASM Postgres engine) for
zero-setup local dev, both driven through the same hand-written
`src/lib/db/client.ts` + `src/lib/db/repositories/**` layer, one SQL dialect
throughout · Recharts for the rating trend chart.

**Want the live HTTPS URL?** See **[docs/GO_LIVE_GUIDE.md](docs/GO_LIVE_GUIDE.md)**
for the simple, non-developer version, or **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**
for the fuller technical reference — Vercel deployment, hosted Postgres
setup, and every environment variable explained.

## Getting started

```bash
npm install
cp .env.example .env      # already done in this delivery; edit as needed
npm run db:seed           # creates ./pgdata (a local PGlite database) and seeds it with the mock dataset
npm run dev                # http://localhost:3000
```

That's it — no external services, no Docker, no Postgres install are
required to run the full app locally. Every page works against the
deterministic mock data layer described below, stored in real Postgres
(via PGlite) the whole time.

> **If you force-kill the dev server** (e.g. `kill -9`, not a normal Ctrl-C),
> PGlite's local `./pgdata` directory can be left in a state that hangs on
> the next `npm run dev`/`npm run db:seed`. If a command that talks to the
> database seems to hang indefinitely, stop it, delete `./pgdata`, and run
> `npm run db:seed` again. This is a local-only PGlite quirk — a real hosted
> Postgres in production doesn't share a process with the app, so it isn't
> affected.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint` | ESLint |
| `npm run db:seed` | (Re)seed the database from the mock Scoutastic/SofaScore providers, including an initial run of the African-debutants job and a few example shortlists/notes |
| `npm run job:weekly` | Run the weekly African-debutants update job standalone (see below) |
| `npm run job:scoutastic-sync` | Run the daily Scoutastic player sync standalone — see [docs/SCOUTASTIC_INTEGRATION.md](docs/SCOUTASTIC_INTEGRATION.md) |
| `npm run test:scoutastic-player` | Fetch one real player from Scoutastic and print the raw JSON + mapped result — the tool for verifying the field mapping against a real response |

## Connecting the real APIs

```bash
SCOUTASTIC_API_TOKEN=...        # src/lib/services/scoutasticService.ts — see docs/SCOUTASTIC_INTEGRATION.md
SCOUTASTIC_API_BASE_URL=https://kvmechelen.scoutastic.com/api/v1
SOFASCORE_PROVIDER=...          # src/lib/services/sofascoreService.ts — see docs/ARCHITECTURE.md §3.2
                                 # (SofaScore itself has no public API; this is a
                                 # pluggable slot for a licensed provider)
```

Setting `SCOUTASTIC_API_TOKEN` turns on the **daily player sync** (a
bounded watchlist of external ids, kept fresh once a day — see
[docs/SCOUTASTIC_INTEGRATION.md](docs/SCOUTASTIC_INTEGRATION.md) for why
it's watchlist-based rather than a full catalog pull) and the "Sync
SCOUTASTIC now" admin button. It does **not** switch the rest of the app
(Home / Players / Debutants / Shortlists) away from the mock dataset — the
real Scoutastic API only exposes a single-player lookup, not a list/search
endpoint, so there's nothing to switch those pages to yet; they keep running
on `src/lib/mock/` exactly as before, and any player the sync adds via the
real API simply appears alongside the mock ones in the local database (and
therefore in all those pages) once synced. Same "leave it unset to run on
mock data" pattern for `SOFASCORE_PROVIDER`.

## The weekly African-debutants update

Two equivalent ways to trigger `runWeeklyDebutUpdate()` on a schedule — pick
whichever fits your hosting:

- **Serverless / hosted cron** (Vercel Cron, GitHub Actions `schedule:`, or
  any scheduler that can make an HTTP call): once a week, `POST
  /api/cron/weekly-update` with header `Authorization: Bearer $CRON_SECRET`.
- **Self-hosted / system cron**: `npm run job:weekly` (see the crontab
  example at the top of `scripts/weeklyUpdate.ts`).

Every run writes an audit row to the `UpdateLog` table — that's what powers
the "Last updated / Next update" line on the African Debutants page. Re-runs
are idempotent: players and debuts are upserted by stable id, never
duplicated (see the comment block in `src/lib/jobs/weeklyDebutUpdate.ts`).

## Branding

**Crest:** every place the club crest appears (sidebar, browser favicon)
reads from one file, `public/brand/crest.svg`. What's there now is a
placeholder — a generic shield-and-monogram mark in the club's colors, not
the real KV Mechelen logo (the brief was explicit not to fabricate/recreate
the official crest). To use the real one: drop the official crest asset in
at that exact path, keeping the filename `crest.svg` — no code changes
needed anywhere. If your official asset is a PNG/JPG instead of an SVG,
save it as `public/brand/crest.png` and change the one `src="/brand/crest.svg"`
reference in `src/components/BrandCrest.tsx` to match.

**Colors:** KVM yellow (`#FFE500`), red (`#E41B13`), and gold (`#E9B646`)
are defined as CSS custom properties in `src/app/globals.css` (sourced from
public brand-color references — swap them there if the club's own style
guide specifies different values). `--accent` (the color used throughout
the UI for links, active nav, buttons, borders, and the rating chart) is
the brand red, tuned slightly brighter for text/icon contrast on the dark
background; `--priority` (the "Priority" scouting-status color) is the
brand gold, deliberately kept distinct from red so it doesn't get confused
with the "Rejected" status. Both are used the same sparing way the app's
original accent color was — small UI elements, not wall-to-wall repainting
— per the brief's own "do not turn every element yellow/red" instruction.

## Configuration, not hard-coding

Two lists the brief specifically asked to keep configurable, each a single
file:

- `src/lib/config/easternEuropeLeagues.ts` — which leagues count as Eastern
  European.
- `src/lib/config/africanNations.ts` — all 54 African nations (not just the
  well-known football ones).

## Known limitations of this delivery

- **Auth** is stubbed (`src/lib/auth.ts`) — no login flow exists yet; the
  seam is there so NextAuth.js/SSO can be added without touching page code.
- **Mock photos** are served from `i.pravatar.cc` (placeholder faces, not
  real players); if that host is unreachable the UI falls back to initials
  automatically.
- The mock dataset draws names from small per-nationality pools, so a
  handful of coincidental full-name repeats are possible across ~400
  generated players (each is still a distinct id/club/age) — a cosmetic
  mock-data limitation, not a data-integrity issue in the real pipeline.
- **The real Scoutastic JSON field mapping is unverified** — the dev
  sandbox this was built in couldn't reach `kvmechelen.scoutastic.com` and
  had no API token to test with. See
  [docs/SCOUTASTIC_INTEGRATION.md §2](docs/SCOUTASTIC_INTEGRATION.md#2--the-json-field-mapping-has-not-been-verified-against-a-real-response)
  for how to verify/correct it (`npm run test:scoutastic-player`) before
  relying on synced data.
- **The database layer was tested against PGlite, not a real hosted
  Postgres** — this dev sandbox has no network access to Supabase/Neon/
  Vercel Postgres either. PGlite runs the same genuine Postgres engine and
  the same SQL dialect, so this is a close proxy (full CRUD across every
  page and API route, idempotent upsert/sync behavior, and a production
  `next build && next start` were all verified against it), but you should
  still smoke-test the app once against your real production `DATABASE_URL`
  after deploying — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Deployment to Vercel could not be executed from this environment** — see
  [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for why, and the step-by-step
  instructions to do it yourself (about 5 minutes).
