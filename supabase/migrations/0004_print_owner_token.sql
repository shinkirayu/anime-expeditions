-- One-off: print (via NOTICE, never stored anywhere else) the tracker token
-- for a specific dashboard user, creating one if they don't have one yet.
-- Safe to re-run: idempotent, only touches this one user's token row.
do $$
declare
    v_user_id uuid;
    v_token   text;
begin
    select id into v_user_id from auth.users where email = 'shinkirayu@gmail.com';
    if v_user_id is null then
        raise exception 'no auth user with that email yet — sign up on the dashboard first';
    end if;

    select token into v_token from public.tracker_tokens where owner_user_id = v_user_id;
    if v_token is null then
        v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
        insert into public.tracker_tokens (owner_user_id, token) values (v_user_id, v_token);
    end if;

    raise notice 'TRACKER_TOKEN=%', v_token;
end $$;
