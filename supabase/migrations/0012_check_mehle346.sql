-- One-off diagnostic: inspect the unexpected mehle346 account under
-- shinkirayu's dashboard to help figure out how/when it got tracked.
do $$
declare
    r record;
begin
    for r in
        select user_id, username, display_name, level, first_seen, last_seen, owner_user_id
        from public.accounts
        where username ilike 'mehle346'
    loop
        raise notice 'user_id=% username=% display_name=% level=% first_seen=% last_seen=% owner=%',
            r.user_id, r.username, r.display_name, r.level, r.first_seen, r.last_seen, r.owner_user_id;
    end loop;
end $$;
