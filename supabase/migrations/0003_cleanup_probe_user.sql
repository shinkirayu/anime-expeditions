-- One-off cleanup: remove the throwaway account created while verifying that
-- email auto-confirmation was correctly enabled.
delete from auth.users where email = 'probe-test-delete-me@example.com';
