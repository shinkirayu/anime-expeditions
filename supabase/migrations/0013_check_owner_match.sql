-- One-off diagnostic: confirm whether mehle346's owner_user_id actually
-- matches shinkirayu@gmail.com's account, or belongs to someone else.
do $$
declare
    v_shinkirayu_id uuid;
begin
    select id into v_shinkirayu_id from auth.users where email = 'shinkirayu@gmail.com';
    raise notice 'shinkirayu_user_id=%', v_shinkirayu_id;
end $$;
