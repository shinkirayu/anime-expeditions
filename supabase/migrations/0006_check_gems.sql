-- One-off diagnostic: confirm dfwrizler's currencies payload actually has
-- Gem=1500 as stored, to verify the dashboard's Gems display is reading real data.
do $$
declare
    r record;
begin
    for r in
        select username, currencies, item_count
        from public.accounts
        where username = 'dfwrizler'
    loop
        raise notice 'account=% currencies=% item_count=%', r.username, r.currencies, r.item_count;
    end loop;
end $$;
