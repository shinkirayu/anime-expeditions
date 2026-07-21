-- One-off diagnostic: confirm dfwrizler's currencies now correctly show Gem
-- after fixing both the StaticInfo load-timing bug and the empty-inventory
-- ingest crash.
do $$
declare
    r record;
begin
    for r in
        select username, currencies, item_count, now() - last_seen as age
        from public.accounts
        where username = 'dfwrizler'
    loop
        raise notice 'account=% currencies=% item_count=% age=%', r.username, r.currencies, r.item_count, r.age;
    end loop;
end $$;
