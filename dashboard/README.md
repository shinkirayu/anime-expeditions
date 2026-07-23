# AE Dashboard

Production-ready web dashboard for tracking Anime Expeditions accounts, built
on React + Vite + TypeScript + Tailwind CSS 4 + Supabase + TanStack Query.

## Quick start

```bash
cd dashboard
cp .env.example .env      # already points at the project's Supabase instance
npm install
npm run dev               # local dev server
npm run build             # typecheck + production build to dist/
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). No
server is required — the app talks to Supabase directly with the anon key,
and RLS enforces access.

## One-time Supabase setup

1. **Schema** — apply `../supabase/migrations/0001_init.sql` (SQL editor or
   `supabase db push`). It creates the tables, indexes, RLS policies, the
   `ingest_snapshot()` write path, and `get_dashboard_stats()`.
2. **Ingest function** — deploy the Edge Function that trackers report to:
   ```bash
   supabase secrets set INGEST_KEY=<long-random-string>
   supabase functions deploy ingest --no-verify-jwt
   ```
3. **Dashboard users** — create users in Supabase Auth (email/password).
   Sign-ups are not open; only provisioned users can read data (RLS).
4. **Tracker** — set the tracker's `CONFIG.Endpoint` to
   `https://<project-ref>.supabase.co/functions/v1/ingest?key=<INGEST_KEY>`.

## Architecture

```
Roblox client (tracker) ──POST──▶ Edge Function /ingest ──rpc──▶ ingest_snapshot()
                                                                      │
                                       accounts (light, indexed) ◀────┤
                                       account_details (heavy)   ◀────┘
                                              ▲          ▲
                          list page (paginated,│          │ detail page only
                          selected columns)────┘          │ (lazy)
                                        Dashboard (React + TanStack Query)
                                              ▲
                              Realtime patches for visible rows only
```

### Two-table split

`accounts` holds only the small, indexed columns the list view needs
(username, level, exp, currencies, counts, last_seen). The heavy payload
(full unit roster, full inventory, raw snapshot) lives in `account_details`
and is fetched only when a detail page is opened. List queries never touch
megabytes of jsonb no matter how many accounts exist.

## Supabase cost optimizations (implemented)

| Concern | Implementation |
|---|---|
| Minimize writes | Tracker diffs client-side; `ingest` dedupes per-instance by hash; `ingest_snapshot()` hashes server-side and skips unchanged payloads; `last_seen` touches throttled to 45s |
| Batch updates | One `rpc` call per report = one DB round trip for both tables |
| Pagination | `useInfiniteQuery` + `.range()`, 30 rows/page, `hasMore` derived from an extra row (no `count` queries) |
| No `SELECT *` | `ACCOUNT_LIST_COLUMNS` explicit column list on the hot path |
| Aggressive caching | TanStack Query `staleTime` 30s, configurable `REFRESH` intervals in `src/lib/queryClient.ts` |
| Indexed filters/sorts | Indexes on `lower(username)`, `level`, `last_seen`, partial index on `in_match` |
| Minimal Realtime | Only `accounts` is published; the list subscribes with `user_id=in.(visible ids)`, re-armed debounced, detached when the tab is hidden; detail pages use a single `eq` filter |
| No refetch on events | Realtime payloads patch the query cache directly — an update costs zero reads |
| Lazy detail data | `account_details` fetched on demand, never background-polled |
| Debounced search | 350ms debounce before any request |
| Duplicate request prevention | TanStack Query request dedup + `staleTime` |
| Stats in one request | `get_dashboard_stats()` RPC returns all header tiles at once |
| Payload size | Tracker sends compact JSON; ingest stores `raw` minus volatile fields |

## Performance

- Route-level code splitting (`React.lazy`) + manual vendor chunks; the
  account detail page is its own 2.7KB (gzip) chunk.
- `content-visibility: auto` on cards and table rows — off-screen entries skip
  layout and paint entirely (cheap virtualization without a library).
- `memo`ized cards so a realtime patch to one row re-renders one card.
- Dependency-free SVG charts instead of a charting library.
- Theme applied pre-paint from `localStorage` (no flash), dark mode default.
- Skeleton placeholders for tiles, grid, and detail page.

## Security

- Supabase Auth (email/password) gates the app; unauthenticated users only see
  the login screen.
- RLS: `SELECT` for `authenticated` only; no client-side write path exists.
- Writes go exclusively through the Edge Function with the service-role key
  (never shipped to the client) plus a shared `INGEST_KEY` secret.
- `ingest_snapshot()` / `get_dashboard_stats()` are locked down with
  `REVOKE`/`GRANT` to the minimum roles.
- Search input is escaped (`%`/`_`) before building the `ilike` filter; login
  input validated before submission.

## Folder structure

```
dashboard/
├─ src/
│  ├─ lib/         # supabase client, query client, types, formatting
│  ├─ hooks/       # data fetching, realtime, auth, debounce
│  ├─ components/  # presentational building blocks
│  ├─ pages/       # route components (lazy-loaded)
│  ├─ App.tsx      # providers, router, auth gate
│  └─ main.tsx
├─ index.html
└─ vite.config.ts
supabase/
├─ migrations/0001_init.sql
└─ functions/ingest/index.ts
```

## Tuning

- Refresh cadence: `REFRESH` in `src/lib/queryClient.ts`.
- Page size: `PAGE_SIZE` in `src/lib/types.ts`.
- Online window (3 min): `ONLINE_WINDOW_MS` in `src/lib/types.ts` — keep it in
  sync with the `interval '3 minutes'` in `get_dashboard_stats()`.
