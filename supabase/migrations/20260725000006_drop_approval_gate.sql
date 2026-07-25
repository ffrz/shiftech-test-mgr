-- Platform Evolution V2, Phase 2 (V2-P2-T01..T02) — drop the global admin-approval
-- gate. Signup becomes self-serve: every new Google sign-in lands directly in the app
-- as role='user', no admin action required. `role` becomes a platform-ops flag
-- ('user'|'admin') rather than an access gate — see docs/PRODUCT_CONSTITUTION.md and
-- docs/ARCHITECTURE_V2.md §2.
--
-- Approach: is_approved() is a `security definer sql` function called from RLS
-- policies across ~18 migration files (projects, test_plans, test_cases, modules,
-- tags, test_runs, test_results, issues, attachments, entity_code_sequences, etc.).
-- Rather than rewrite every one of those policies (high risk, same shape of change as
-- the is_admin()/is_approved() redefinition already done in Phase 1's migration),
-- redefine is_approved() to just check the account is active (not soft-deleted) — it
-- no longer distinguishes 'pending' from 'user'/'admin', because after V2-P1-T01's
-- backfill and this migration, 'pending' can no longer occur for any account.

-- === V2-P2-T01: confirm no remaining pending rows (defensive, idempotent) ===
-- (V2-P1-T01 already did this backfill; re-running here is a safety net in case this
-- migration is applied to a database where Phase 1's migration ran before this fix
-- landed, or a row slipped through via a race with handle_new_user().)

update users set role = 'user' where role = 'pending';

-- === V2-P2-T02: users.role no longer allows 'pending'; is_approved() simplified ===

alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('user', 'admin'));

create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from users where id = auth.uid() and deleted_at is null
  );
$$ language sql security definer set search_path = public stable;

-- handle_new_user() (redefined in Phase 1's migration) already inserts new users with
-- role='user' directly — no change needed there. This migration only removes the
-- 'pending' possibility going forward and simplifies the gate function accordingly.
