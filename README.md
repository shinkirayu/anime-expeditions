# Anime Expeditions — Account Tracking Suite

End-to-end tracking for Anime Expeditions accounts: a Roblox client tracker
that reports the local player's own account state, a Supabase backend that
stores it with change-only writes, and a web dashboard to browse it all.

```
src/AnimeExpeditionsTracker.lua   Roblox client tracker (v2, ReplicaService-based)
supabase/migrations/              Postgres schema, indexes, RLS, ingest function
supabase/functions/ingest/        Edge Function the trackers POST to
dashboard/                        React + Vite + TS + Tailwind dashboard
```

## Components

### Tracker (`src/AnimeExpeditionsTracker.lua`)

Reads the LocalPlayer's account state from the game's Madwork ReplicaService
replication (`ReplicatedStorage.Shared.ReplicaClient` → `PlayerData` replica)
and enriches raw ids with the game's own static info sheets
(`Shared/Information/Items`, `Units`, `PlayerLevelInfo`).

- Snapshot diffing: a report is only sent when something actually changed.
- Fail-safe: every read is `pcall`-guarded; missing modules degrade gracefully
  with `FOUND`/`MISSING` debug logs.
- Reports account (username/id/level/exp), currencies, inventory, full unit
  roster, progress (completed maps + live match state), and stats as one
  JSON payload (SchemaVersion 2).
- Point `CONFIG.Endpoint` at the deployed ingest function:
  `https://<project-ref>.supabase.co/functions/v1/ingest?key=<INGEST_KEY>`

### Backend (`supabase/`)

- `accounts` (light, indexed) + `account_details` (heavy jsonb) split so list
  queries stay cheap at tens of thousands of accounts.
- `ingest_snapshot()` Postgres function: one round trip per report, hash-based
  change detection, zero writes for unchanged payloads, throttled
  `last_seen` touches.
- RLS everywhere; reads for authenticated dashboard users only; writes only
  via the Edge Function holding the service-role key.

### Dashboard (`dashboard/`)

Responsive dark-mode dashboard with search/filter/sort, infinite scroll,
overview cards, detail pages with lazy-loaded units/inventory, realtime
online status for visible rows, and charts — aggressively optimized to
minimize Supabase reads, writes, and bandwidth. See `dashboard/README.md`
for the full setup guide and the optimization table.

## Setup order

1. Apply `supabase/migrations/0001_init.sql` to your Supabase project.
2. `supabase secrets set INGEST_KEY=<random>` and
   `supabase functions deploy ingest --no-verify-jwt`.
3. Create dashboard users in Supabase Auth.
4. `cd dashboard && cp .env.example .env && npm install && npm run build`,
   deploy `dist/` anywhere static.
5. Set the tracker's `CONFIG.Endpoint` and run it on the client.
