-- One-off diagnostic: confirm the tracker is actually writing and how stale
-- last_seen currently is, to verify the online/offline + heartbeat fix.
do $$
declare
    r record;
begin
    for r in
        select username, level, in_match, last_seen, now() - last_seen as age
        from public.accounts
        order by last_seen desc
        limit 5
    loop
        raise notice 'account=% level=% in_match=% age=%', r.username, r.level, r.in_match, r.age;
    end loop;
end $$;
