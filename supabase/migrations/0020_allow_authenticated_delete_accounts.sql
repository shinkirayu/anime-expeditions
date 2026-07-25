-- Lets dashboard users remove tracked accounts (Units tab bulk-delete).
-- account_details cascades via its existing FK, so no policy needed there.

drop policy if exists "authenticated can delete accounts" on public.accounts;
create policy "authenticated can delete accounts"
    on public.accounts for delete
    to authenticated
    using (true);
