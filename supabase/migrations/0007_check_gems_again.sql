-- One-off diagnostic: re-check dfwrizler's currencies after the StaticInfo
-- load-timing fix, to confirm Gem now classifies as a currency correctly.
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
