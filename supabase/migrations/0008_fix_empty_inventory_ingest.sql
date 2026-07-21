-- Fix: Roblox's JSON encoder can't distinguish an empty object from an empty
-- array — an empty Lua table always serializes as `[]`. ingest_snapshot()
-- called jsonb_object_keys() on the Inventory field, which errors on `[]`
-- ("cannot call jsonb_object_keys on an array"). This went unnoticed until an
-- account with only currencies (no other items) produced a genuinely empty
-- Inventory. Normalize non-object jsonb to '{}' before counting keys.
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
    if jsonb_typeof(v_units) <> 'array' then
        v_units := '[]'::jsonb;
    end if;

    v_inv := coalesce(p->'Inventory', '{}'::jsonb);
    if jsonb_typeof(v_inv) <> 'object' then
        v_inv := '{}'::jsonb;
    end if;

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
         jsonb_array_length(v_units),
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
