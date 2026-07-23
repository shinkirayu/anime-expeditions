-- Re-check dfwrizler's Raid field after waiting for a fresh tracker flush.
do $$
declare
  r record;
begin
  for r in
    select username, level, progress->'Raid' as raid, updated_at
    from accounts
    where username = 'dfwrizler'
  loop
    raise notice 'user=% level=% raid=% updated_at=%', r.username, r.level, r.raid, r.updated_at;
  end loop;
end $$;
