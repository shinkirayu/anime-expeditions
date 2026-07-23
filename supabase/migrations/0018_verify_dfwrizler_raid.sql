-- Diagnostic: confirm dfwrizler specifically now reports Raid as Locked.
do $$
declare
  r record;
begin
  for r in
    select username, level, exp, progress->'Raid' as raid, updated_at
    from accounts
    where username = 'dfwrizler'
  loop
    raise notice 'user=% level=% exp=% raid=% updated_at=%', r.username, r.level, r.exp, r.raid, r.updated_at;
  end loop;
end $$;
