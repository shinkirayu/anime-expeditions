-- Diagnostic: confirm the tracker's fresh push reports Raid as Locked for
-- accounts below Gamemodes.Raid.RequiredLevel (25), instead of showing a
-- misleading unlocked stage.
do $$
declare
  r record;
begin
  for r in
    select username, level, progress->'Raid' as raid
    from accounts
    order by updated_at desc
    limit 5
  loop
    raise notice 'user=% level=% raid=%', r.username, r.level, r.raid;
  end loop;
end $$;
