-- One-off diagnostic: confirm the new compact Match data landed correctly
-- (no giant waypoint/path payloads), reflecting the actual in-progress stage.
do $$
declare
    r record;
begin
    for r in
        select username, in_match, progress, now() - last_seen as age
        from public.accounts
        where username = 'dfwrizler'
    loop
        raise notice 'account=% in_match=% progress=% age=%', r.username, r.in_match, r.progress, r.age;
    end loop;
end $$;
