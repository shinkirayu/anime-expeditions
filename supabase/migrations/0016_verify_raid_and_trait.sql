-- One-off diagnostic: confirm Raid progress landed correctly for the
-- hbadevus5218 alt account, and that unit Trait handling didn't break anything.
do $$
declare
    r record;
begin
    for r in
        select username, progress -> 'Raid' as raid, progress -> 'Story' as story, now() - last_seen as age
        from public.accounts
        where username = 'hbadevus5218'
    loop
        raise notice 'account=% raid=% story=% age=%', r.username, r.raid, r.story, r.age;
    end loop;
end $$;
