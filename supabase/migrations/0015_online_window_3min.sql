-- Widen the "online" grace period from 2 minutes to 3 minutes, matching
-- ONLINE_WINDOW_MS in dashboard/src/lib/types.ts.
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'total',    count(*),
        'online',   count(*) filter (where last_seen > now() - interval '3 minutes'),
        'in_match', count(*) filter (where in_match and last_seen > now() - interval '3 minutes'),
        'avg_level', round(coalesce(avg(level), 0), 1),
        'max_level', coalesce(max(level), 0)
    )
    from public.accounts
    where owner_user_id = auth.uid();
$$;
