-- Anime Expeditions dashboard: per-user tracker tokens + owner-scoped RLS
--
-- Design notes
--   * Every dashboard user gets their own tracker token (issued lazily via
--     get_or_create_my_tracker_token()). The Roblox tracker's Endpoint uses
--     that token instead of one shared INGEST_KEY, so multiple friends can
--     each run their own copy of the script and only ever see their own
--     tracked account(s) on the dashboard.
--   * accounts.owner_user_id ties a tracked Roblox account to the dashboard
--     user whose token reported it. RLS on accounts/account_details is
--     rewritten from "any authenticated user" to "owner only".

create table if not exists public.tracker_tokens (
    owner_user_id uuid primary key references auth.users (id) on delete cascade,
    token         text not null unique,
    created_at    timestamptz not null default now()
);

create index if not exists tracker_tokens_token_idx on public.tracker_tokens (token);

alter table public.tracker_tokens enable row level security;

revoke all on public.tracker_tokens from public, anon, authenticated;

drop policy if exists "user can read own token" on public.tracker_tokens;
create policy "user can read own token"
    on public.tracker_tokens for select
    to authenticated
    using (owner_user_id = auth.uid());

grant select on public.tracker_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- get_or_create_my_tracker_token: callable by any logged-in dashboard user.
-- Returns their existing token, or mints and stores a new one on first call.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_my_tracker_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_token text;
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;

    select token into v_token from public.tracker_tokens where owner_user_id = auth.uid();
    if v_token is null then
        v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
        insert into public.tracker_tokens (owner_user_id, token) values (auth.uid(), v_token);
    end if;

    return v_token;
end;
$$;

revoke all on function public.get_or_create_my_tracker_token() from public, anon;
grant execute on function public.get_or_create_my_tracker_token() to authenticated;

-- ---------------------------------------------------------------------------
-- Scope accounts to their owner.
-- ---------------------------------------------------------------------------
alter table public.accounts add column if not exists owner_user_id uuid references auth.users (id) on delete cascade;
create index if not exists accounts_owner_idx on public.accounts (owner_user_id);

drop policy if exists "authenticated can read accounts" on public.accounts;
drop policy if exists "owner can read own accounts" on public.accounts;
create policy "owner can read own accounts"
    on public.accounts for select
    to authenticated
    using (owner_user_id = auth.uid());

drop policy if exists "authenticated can read account_details" on public.account_details;
drop policy if exists "owner can read own account_details" on public.account_details;
create policy "owner can read own account_details"
    on public.account_details for select
    to authenticated
    using (
        exists (
            select 1 from public.accounts a
            where a.user_id = account_details.user_id
              and a.owner_user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- ingest_snapshot now takes the reporting token and resolves its owner.
-- Old single-argument signature is replaced (no client ever calls this
-- directly; only the Edge Function does, via service_role).
-- ---------------------------------------------------------------------------
drop function if exists public.ingest_snapshot(jsonb);

create or replace function public.ingest_snapshot(p jsonb, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_owner    uuid;
    v_user_id  bigint;
    v_hash     text;
    v_existing record;
    v_units    jsonb;
    v_inv      jsonb;
begin
    select owner_user_id into v_owner from public.tracker_tokens where token = p_token;
    if v_owner is null then
        return jsonb_build_object('changed', false, 'reason', 'invalid token');
    end if;

    if p is null or (p->>'Ready')::boolean is distinct from true then
        return jsonb_build_object('changed', false, 'touched', false, 'reason', 'not ready');
    end if;

    v_user_id := (p->'Account'->>'UserId')::bigint;
    if v_user_id is null then
        raise exception 'payload missing Account.UserId';
    end if;

    v_hash := md5((p - 'CapturedAt')::text);

    select payload_hash, last_seen into v_existing
    from public.accounts where user_id = v_user_id;

    if found and v_existing.payload_hash = v_hash then
        if v_existing.last_seen < now() - interval '45 seconds' then
            update public.accounts set last_seen = now() where user_id = v_user_id;
            return jsonb_build_object('changed', false, 'touched', true);
        end if;
        return jsonb_build_object('changed', false, 'touched', false);
    end if;

    v_units := coalesce(p->'Units', '[]'::jsonb);
    v_inv   := coalesce(p->'Inventory', '{}'::jsonb);

    insert into public.accounts as a
        (user_id, owner_user_id, username, display_name, level, exp, currencies, progress,
         stats, unit_count, item_count, in_match, payload_hash, last_seen, updated_at)
    values
        (v_user_id, v_owner,
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
        owner_user_id = excluded.owner_user_id,
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

revoke all on function public.ingest_snapshot(jsonb, text) from public, anon, authenticated;
grant execute on function public.ingest_snapshot(jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- get_dashboard_stats now reports only the caller's own tracked accounts.
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
    from public.accounts
    where owner_user_id = auth.uid();
$$;
