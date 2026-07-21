-- One-off diagnostic: confirm Trait Crystal now shows up as a pinned currency
-- with its icon, alongside Gems.
do $$
declare
    r record;
begin
    for r in
        select username, currencies, now() - last_seen as age
        from public.accounts
        where username = 'dfwrizler'
    loop
        raise notice 'account=% currencies=% age=%', r.username, r.currencies, r.age;
    end loop;
end $$;
