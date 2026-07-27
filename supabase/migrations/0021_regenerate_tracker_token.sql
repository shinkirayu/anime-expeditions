-- Self-service tracker token rotation.
--
-- Previously the only way to invalidate a leaked tracker token (e.g. a user
-- accidentally shared their "Get script" output, which embeds the token in
-- plain text) was to ask an operator to fix it at the DB level. This gives
-- dashboard users a way to mint a fresh token themselves; the old token stops
-- working immediately since it's overwritten, not just superseded.

create or replace function public.regenerate_my_tracker_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_token text;
begin
    if auth.uid() is null then
        raise exception 'not authenticated';
    end if;

    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

    update public.tracker_tokens
    set token = v_token, created_at = now()
    where owner_user_id = auth.uid();

    if not found then
        insert into public.tracker_tokens (owner_user_id, token) values (auth.uid(), v_token);
    end if;

    return v_token;
end;
$$;

revoke all on function public.regenerate_my_tracker_token() from public, anon;
grant execute on function public.regenerate_my_tracker_token() to authenticated;
