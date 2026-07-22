-- One-off diagnostic: confirm the new Story progress field landed correctly.
do $$
declare
    r record;
begin
    for r in
        select username, progress -> 'Story' as story, now() - last_seen as age
        from public.accounts
        where username = 'dfwrizler'
    loop
        raise notice 'account=% story=% age=%', r.username, r.story, r.age;
    end loop;
end $$;
