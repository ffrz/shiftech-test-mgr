-- Prevent an admin from changing their own role (self-promote or self-demote) --
-- requested after the Phase 7 walkthrough surfaced that the existing "admins update
-- profiles" policy (now on `users`) only checked is_admin(), with no guard against a
-- row's owner acting on themselves. UI already hides these actions for the current
-- user (see UserManagementPage.tsx), but that's cosmetic only — this closes the same
-- gap at the RLS layer so it can't be bypassed via a direct API call.
--
-- Deletion (softDelete) and general non-admin self-updates are unaffected: a user can
-- still update their own row for reasons other than role (there currently are none,
-- but this policy is scoped to "admins acting on someone else's row", not "any update
-- to your own row").

drop policy if exists "admins update profiles" on users;

create policy "admins update other users" on users for update
  using (is_admin() and id <> auth.uid())
  with check (is_admin() and id <> auth.uid());
