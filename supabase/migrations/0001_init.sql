-- Anime Expeditions dashboard: initial schema
--
-- Design notes
--   * `accounts` is the LIGHT table the dashboard lists/sorts/filters on.
--     Only small, indexed columns live here so list queries stay cheap.
--   * `account_details` is the HEAVY 1:1 table (units/inventory/raw payload).
--     It is only read on the account detail page (lazy loading).
--   * All writes go through ingest_snapshot() so one tracker report costs a
--     single DB round trip, and unchanged payloads cost zero writes.

create table if not exists public.accounts (
    user_id      bigint primary key,
    username     text not null,
    display_name text,
    level        integer,
    exp          bigint,
    -- Small denormalized jsonb kept on the light table because overview cards
    -- show currencies; heavy collections live in account_details.
    currencies   jsonb not null default '{}'::jsonb,
    progress     jsonb not null default '{}'::jsonb,
    stats        jsonb not null default '{}'::jsonb,
    unit_count   integer not null default 0,
    item_count   integer not null default 0,
    in_match     boolean not null default false,
    payload_hash text,
    first_seen   timestamptz not null default now(),
    last_seen    timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists public.account_details (
    user_id    bigint primary key references public.accounts (user_id) on delete cascade,
    units      jsonb not null default '[]'::jsonb,
    inventory  jsonb not null default '{}'::jsonb,
    raw        jsonb,
    updated_at timestamptz not null default now()
);

-- Indexes for the dashboard's common queries (search, sort, online filter).
create index if not exists accounts_username_lower_idx on public.accounts (lower(username) text_pattern_ops);
create index if not exists accounts_level_idx          on public.accounts (level desc nulls last);
create index if not exists accounts_last_seen_idx      on public.accounts (last_seen desc);
create index if not exists accounts_in_match_idx       on public.accounts (in_match) where in_match;

-- ---------------------------------------------------------------------------
-- Row Level Security: dashboard users (authenticated) can read; nobody writes
-- directly from the client. All writes come from the ingest Edge Function via
-- ingest_snapshot() running with the service role.
-- ---------------------------------------------------------------------------
alter table public.accounts        enable row level security;
alter table public.account_details enable row level security;

drop policy if exists "authenticated can read accounts" on public.accounts;
create policy "authenticated can read accounts"
    on public.accounts for select
    to authenticated
    using (true);

drop policy if exists "authenticated can read account_details" on public.account_details;
create policy "authenticated can read account_details"
    on public.account_details for select
    to authenticated
    using (true);

-- ---------------------------------------------------------------------------
-- ingest_snapshot: one round trip per tracker report.
--   * Hashes the payload (minus the volatile CapturedAt stamp).
--   * Unchanged payload  -> at most a cheap last_seen touch (throttled to 45s).
--   * Changed payload    -> upsert light row + heavy row in the same call.
-- Returns {changed, touched} so the Edge Function can report what happened.
-- ---------------------------------------------------------------------------
create or replace function public.ingest_snapshot(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id  bigint;
    v_hash     text;
    v_existing record;
    v_units    jsonb;
    v_inv      jsonb;
begin
    if p is null or (p->>'Ready')::boolean is distinct from true then
        return jsonb_build_object('changed', false, 'touched', false, 'reason', 'not ready');
    end if;

    v_user_id := (p->'Account'->>'UserId')::bigint;
    if v_user_id is null then
        raise exception 'payload missing Account.UserId';
    end if;

    -- jsonb normalizes key order, so this hash is stable across re-encodes.
    v_hash := md5((p - 'CapturedAt')::text);

    select payload_hash, last_seen into v_existing
    from public.accounts where user_id = v_user_id;

    if found and v_existing.payload_hash = v_hash then
        -- Nothing changed. Touch last_seen only when it is getting stale so a
        -- 2s-interval tracker does not generate a write storm.
        if v_existing.last_seen < now() - interval '45 seconds' then
            update public.accounts set last_seen = now() where user_id = v_user_id;
            return jsonb_build_object('changed', false, 'touched', true);
        end if;
        return jsonb_build_object('changed', false, 'touched', false);
    end if;

    v_units := coalesce(p->'Units', '[]'::jsonb);
    v_inv   := coalesce(p->'Inventory', '{}'::jsonb);

    insert into public.accounts as a
        (user_id, username, display_name, level, exp, currencies, progress,
         stats, unit_count, item_count, in_match, payload_hash, last_seen, updated_at)
    values
        (v_user_id,
         coalesce(p->'Account'->>'Username', 'unknown'),
         p->'Account'->>'DisplayName',
         (p->'Account'->>'Level')::integer,
         (p->'Account'->>'Exp')::bigint,
         coalesce(p->'Currencies', '{}'::jsonb),
         coalesce(p->'Progress', '{}'::jsonb),
         coalesce(p->'Stats', '{}'::jsonb),
         coalesce(jsonb_array_length(v_units), 0),
         (select count(*) from jsonb_object_keys(v_inv)),
         coalesce((p->'Progress'->>'InMatch')::boolean, false),
         v_hash, now(), now())
    on conflict (user_id) do update set
        username     = excluded.username,
        display_name = excluded.display_name,
        level        = excluded.level,
        exp          = excluded.exp,
        currencies   = excluded.currencies,
        progress     = excluded.progress,
        stats        = excluded.stats,
        unit_count   = excluded.unit_count,
        item_count   = excluded.item_count,
        in_match     = excluded.in_match,
        payload_hash = excluded.payload_hash,
        last_seen    = now(),
        updated_at   = now();

    insert into public.account_details as d (user_id, units, inventory, raw, updated_at)
    values (v_user_id, v_units, v_inv, p - 'CapturedAt', now())
    on conflict (user_id) do update set
        units      = excluded.units,
        inventory  = excluded.inventory,
        raw        = excluded.raw,
        updated_at = now();

    return jsonb_build_object('changed', true, 'touched', true);
end;
$$;

-- Least privilege: only the service role (Edge Function) may ingest.
revoke all on function public.ingest_snapshot(jsonb) from public;
revoke all on function public.ingest_snapshot(jsonb) from anon;
revoke all on function public.ingest_snapshot(jsonb) from authenticated;
grant execute on function public.ingest_snapshot(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- get_dashboard_stats: all header tiles in ONE request instead of four counts.
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'total',    count(*),
        'online',   count(*) filter (where last_seen > now() - interval '2 minutes'),
        'in_match', count(*) filter (where in_match and last_seen > now() - interval '2 minutes'),
        'avg_level', round(coalesce(avg(level), 0), 1),
        'max_level', coalesce(max(level), 0)
    )
    from public.accounts;
$$;

revoke all on function public.get_dashboard_stats() from public;
revoke all on function public.get_dashboard_stats() from anon;
grant execute on function public.get_dashboard_stats() to authenticated;
grant execute on function public.get_dashboard_stats() to service_role;

-- Realtime: only the light table is published; the dashboard subscribes with
-- per-row filters (user_id=in.(...)) for rows actually on screen.
do $$
begin
    alter publication supabase_realtime add table public.accounts;
exception when duplicate_object then
    null;
end;
$$;
