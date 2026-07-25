# Roadmap — Testify Platform Evolution (V2)

Execution plan for [`ARCHITECTURE_V2.md`](./ARCHITECTURE_V2.md), governed by
[`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md). Go backend track is
**paused** for the duration of this roadmap — see [`backend/README.md`](../backend/README.md).

Status legend: `todo` · `in-progress` · `done` · `blocked`

Update this file the same way as [`TASKS.md`](./TASKS.md) — flip status as work lands,
and mirror the current phase's next-up items into [`TODO.md`](../TODO.md).

---

## The golden path this roadmap serves

Every phase below exists to keep this flow working end-to-end, per the Constitution's
**MVP Success Criteria** — a new user must be able to do all of this in under an hour:

```
1. Register an account
2. Create a project
3. Invite team members
4. Write test cases
5. Organize them into a test plan
6. Execute testing
7. Record results
8. Create issues
9. (finish within one hour)
```

Steps 4–8 already work today (validated Testing Domain, untouched by this roadmap).
Steps 1–3 are what's actually changing — self-serve registration, project ownership,
and real team invitation replace the current admin-gated / direct-add model. **Phase 7
is a mandatory walk-through of this exact list before calling the roadmap done.**

Any task below that doesn't serve steps 1–3 (or protect 4–8 from regressing) should be
challenged against the Constitution's Feature Acceptance Rule before being built.

---

## Phase Overview

| Phase | Goal | Golden-path step(s) it unblocks | Depends on |
|---|---|---|---|
| P1 | Split `profiles` → `users` + `profiles`, username identity | 1 (register) — foundation for 2–3 | — |
| P2 | Drop approval gate, `admin` becomes ops-flag not login-gate | 1 (register, self-serve) | P1 |
| P3 | Project ownership + visibility (private/unlisted/public) | 2 (create a project) | P1 |
| P4 | Project membership: invite → accept/decline flow | 3 (invite team members) | P1, P3 |
| P5 | Test Suite Template ownership + visibility | Community feature, not on the golden path — see note below | P1 |
| P6 | Minimal public identity lookup (`/@username`) | Supports 3 (invite by username needs a resolvable target) | P1 |
| P7 | Golden-path acceptance walkthrough + docs sync | Validates 1–9 end-to-end | P1–P6 |

**Why P5 is in this roadmap despite not being on the golden path:** Test Suite
Templates are an explicit Core Feature and Community capability in the Constitution
("share reusable Test Suite templates"), and they already depend on the P1 identity
split (an owner has to be *someone*). It's scoped small (owner + visibility, clone-only,
no fork lineage) specifically so it doesn't compete with the golden path for effort.

Each phase ships as its own PR(s) and its own `supabase/migrations/*.sql` file(s),
per existing repo convention. Do not bundle phases into one migration — each must be
independently revertable given the "reversible where noted" guidance in
`ARCHITECTURE_V2.md` §7.

---

## Phase 1 — Identity Split (`users` + `profiles`)

Foundation for everything else. Riskiest phase (touches every repository that reads
`profiles` today) — do this first while the blast radius is easiest to reason about.
Serves golden-path step 1 (Register) indirectly: registration itself doesn't change
shape yet, but every later phase needs a stable identity model to build on.

| ID | Task | Status |
|---|---|---|
| V2-P1-T01 | Migration: backfill `role = 'pending'` → `'user'` on current `profiles` (unblocks P2 later, safe to do now) | done |
| V2-P1-T02 | Migration: `alter table profiles rename to users`; add `users_role_check` (`user`\|`admin`) | done |
| V2-P1-T03 | Migration: create new `profiles` table (`id`, `username` unique, `display_name`, `avatar_url`, `bio`, timestamps) + `idx_profiles_username` | done |
| V2-P1-T04 | Migration: backfill `profiles` row per existing `users` row — `username` from `split_part(email,'@',1)`, de-duplicate with numeric suffix on collision, `display_name` from old `full_name` | done |
| V2-P1-T05 | Migration: RLS on new `profiles` — public `select` (`using (true)`), self-only `update` | done |
| V2-P1-T06 | Update `handle_new_user()` trigger to insert into both `users` and `profiles` on signup (generate a default username, e.g. from email local-part + random suffix) | done |
| V2-P1-T07 | `types/domain.ts`: split `Profile` into `User` (email/role) and `Profile` (username/displayName/avatarUrl/bio) per §3 of ARCHITECTURE_V2 | done |
| V2-P1-T08 | `helpers/mappers.ts`: add `mapUserRow`/`mapProfileRow`, remove old combined mapper | done |
| V2-P1-T09 | `repositories/profileRepository.ts`: split into `userRepository.ts` (email/role, admin-user-management only) + `profileRepository.ts` (public fields). Also split `profileService.ts` → `userService.ts`/`profileService.ts`, `useProfiles` → `useUsers` | done |
| V2-P1-T10 | Audit + fix every `.from('profiles')` call site across services/hooks/pages (testResult tester join, issue assignee join, project member join, etc.) — repoint to `profiles` (public fields) or `users` (email/role) as appropriate. Also fixed `is_admin()`/`is_approved()` SQL functions, which silently would have broken (see migration comment) | done |
| V2-P1-T11 | `useAuth.tsx` / `AuthProvider`: fetch both `users` row (role) and `profiles` row (identity) on session load, expose both via `useAuthContext()` | done |
| V2-P1-T12 | Settings page: let a user view/edit their own `username`, `display_name`, `avatar_url`, `bio` | done |
| V2-P1-T13 | Regression pass: verified against Supabase cloud project (`pgyuxtwzhflzujhrxixl`) on `feature/platform-foundation` — users/profiles rows intact, FKs correctly repointed, `is_admin()`/`is_approved()` correct, tester/assignee/member name resolution all pass. tsc + lint + build clean. One gap found and fixed (see below) | done |

Also landed ahead of schedule: Phase 6's `/@:username` minimal lookup page (V2-P6-T01/T02),
built alongside T12 since both touch `profileService`. See Phase 6 below — only V2-P6-T03
(username picker reused by the Phase 4 invite UI) remains there.

**Verification gap found & fixed:** the new `profiles` table wasn't added to the
`supabase_realtime` publication (the old `profiles`' membership carried forward to the
renamed `users` table, but the newly created `profiles` needed its own explicit add) — fixed
in `supabase/migrations/20260725000008_fix_profiles_realtime_publication.sql`.

**Migration files:** `20260725000005_split_profiles_into_users_and_profiles.sql`,
`20260725000008_fix_profiles_realtime_publication.sql`. Applied and verified on staging —
phase fully closed.

**Exit criteria:** app builds, lints, and every existing feature (test runs, issues,
project members list) still renders tester/assignee names correctly after the split.

---

## Phase 2 — Drop Approval Gate

Serves golden-path step 1: registration must be genuinely self-serve, not gated on an
admin approving the account — this is the biggest single simplification in the roadmap
and directly required for "finish within one hour" to even be possible for a first-time user.

| ID | Task | Status |
|---|---|---|
| V2-P2-T01 | Confirm `role = 'pending'` fully backfilled from V2-P1-T01 (no remaining `pending` rows) | done |
| V2-P2-T02 | Redefine `is_approved()` to check active account only (not soft-deleted) instead of dropping it — same low-risk approach as Phase 1's `is_admin()` redefinition, avoids rewriting ~18 files' worth of policies that call it | done |
| V2-P2-T03 | `ProtectedRoute.tsx`: remove the `pending` branch/redirect — login success is sufficient | done |
| V2-P2-T04 | `AdminRoute.tsx`: confirmed already scoped correctly (admin-only screens), no change needed | done |
| V2-P2-T05 | `UserManagementPage.tsx`: removed `approve`/`revokeAccess` actions and the `userService` methods behind them (no more "back to pending" concept); kept promote/demote `user`↔`admin` and soft-delete | done |
| V2-P2-T06 | Update `CLAUDE.md` Auth & RBAC section to describe self-serve signup instead of pending/approval flow | done |

Also: `UserRole` type narrowed to `'user' \| 'admin'` (dropped `'pending'`), `PendingApprovalPage.tsx` and its route deleted, `isApproved`/`isPending` removed from `useAuthContext()`.

**Migration file:** `supabase/migrations/20260725000006_drop_approval_gate.sql`. Applied
and verified alongside Phase 1's migration in the same staging pass (V2-P1-T13) — phase
fully closed.

**Exit criteria:** a brand-new Google sign-in lands directly in the app with a
usable account — no admin action required.

---

## Phase 3 — Project Ownership + Visibility

Serves golden-path step 2 (create a project). Visibility is scoped strictly to what's
needed for ownership to make sense (private by default) — public/unlisted are included
because the Constitution's Community section implies a project can be shared, but no
public project *directory/browse* UI is built here (would drift toward a showcase, see
Phase 6 note).

| ID | Task | Status |
|---|---|---|
| V2-P3-T01 | Migration: `projects.owner_type` (`check in ('user')`, default `'user'`), `projects.owner_id` — reused existing `created_by` column (added in 20260725000002 for an unrelated RLS fix) by renaming it, rather than adding a second column | done |
| V2-P3-T02 | Migration: backfill `owner_id` from earliest `manager` in `project_members` per project | done (already backfilled as `created_by`; defensive re-backfill included) |
| V2-P3-T03 | Migration: `alter column owner_id set not null` once backfilled | done |
| V2-P3-T04 | Migration: `projects.visibility` (`private`\|`unlisted`\|`public`, default `private`) + partial index on `public` | done |
| V2-P3-T05 | Migration: update `projects` select RLS — public/unlisted readable without membership, private requires `has_project_access()` | done |
| V2-P3-T06 | `types/domain.ts`: add `ownerId`, `ownerType`, `visibility` to `Project` | done |
| V2-P3-T07 | `projectRepository.ts` / `projectService.ts`: include new fields in create/update/mappers | done |
| V2-P3-T08 | `ProjectsPage.tsx` create/edit form: add visibility selector (default Private) | done |
| V2-P3-T09 | Project list/detail: visibility badge added to `ProjectsPage.tsx` and `ProjectDetailPage.tsx`. Owner *name* display deferred (not blocking) — would need a `profiles` lookup by `ownerId`, revisit if it becomes needed | done |

**Migration file:** `supabase/migrations/20260725000007_project_ownership_and_visibility.sql`.
Landed after Phase 1/2's staging verification pass — **not yet independently smoke-tested**.
Low risk (renames an existing verified-working column, adds one new column with a safe
default) but worth a quick staging apply before merging to main, same as Phase 4 below.

**Exit criteria:** creating a project sets an owner and a visibility; existing
projects all have a valid owner post-migration.

---

## Phase 4 — Membership Invite/Accept Flow

Serves golden-path step 3 (invite team members) — this is the step that most directly
determines whether "invite team members" takes minutes or requires manual admin
intervention, so it's the last piece before the golden path is fully self-serve.

| ID | Task | Status |
|---|---|---|
| V2-P4-T01 | Migration: `project_members.status` (`invited`\|`accepted`\|`declined`, default `'accepted'` for existing rows), `invited_by`, `invited_at`, `responded_at` | done |
| V2-P4-T02 | Migration: rewrite `has_project_access()` / `is_project_manager()` / all four capability helpers (`can_edit_project_content`, `can_delete_project_content`, `can_run_tests`, `can_manage_issues`) to require `status = 'accepted'` (or project owner) | done |
| V2-P4-T03 | Migration: add RLS policy so an invitee can see + respond to their own `invited` row (`user_id = auth.uid()`) even without project access | done |
| V2-P4-T04 | `types/domain.ts`: add `status`, `invitedBy`, `invitedAt`, `respondedAt` to `ProjectMember`; new `ProjectMemberInvitation` type (adds `project: {id, name}`) for the cross-project "My Invitations" list | done |
| V2-P4-T05 | `projectMemberRepository.ts`: replaced `add()` with `invite(projectId, userId, role, invitedBy)`, added `respond()` (accept/decline), `listPendingInvitationsForUser()` | done |
| V2-P4-T06 | `projectMemberService.ts`: `invite`/`accept`/`decline`/`listOwnPendingInvitations` — validation that write access requires acceptance now lives in RLS (capability helpers), not duplicated client-side | done |
| V2-P4-T07 | New hook `useProjectInvitations` (current user's pending invites, wraps accept/decline + cache invalidation) | done |
| V2-P4-T08 | Project Members tab (`ProjectSettingsPage.tsx`): renamed Add→Invite throughout, added a Status column/badge (Invited/Accepted/Declined) | done |
| V2-P4-T09 | "Pending Invitations" card on `HomePage.tsx` — accept/decline buttons. Kept as a simple list, not a notification system — notifications are explicitly deferred per ARCHITECTURE_V2 §9 | done |
| V2-P4-T10 | Updated `handle_new_project()` trigger — explicitly sets `status='accepted'`, `invited_by=auth.uid()`, `responded_at=now()` for the creator's own membership row (defensive; `has_project_access`/`is_project_manager` also independently check `projects.owner_id` so the owner is never blocked even if this row is somehow missing) | done |

**Migration file:** `supabase/migrations/20260725000009_project_membership_invite_accept.sql`.
Not yet independently smoke-tested on staging — recommend testing alongside Phase 3's
migration before merging to main.

**Exit criteria:** inviting a user by username puts them in a pending state; they
must accept before `has_project_access()` grants them anything.

---

## Phase 5 — Test Suite Template Ownership + Visibility

Serves the Constitution's Community feature ("share reusable Test Suite templates"),
not directly a golden-path step. Kept intentionally small: ownership + visibility on
top of the existing clone-into-project mechanic. No forking, no versioning, no
storefront/browse UI beyond a simple "mine" vs "public" filter.

| ID | Task | Status |
|---|---|---|
| V2-P5-T01 | Migration: `test_suites.owner_id` (FK `users`) — resolved backfill by assigning existing global suites to the oldest admin account (no product requirement for a "correct" historical owner; can be reassigned manually later) | done |
| V2-P5-T02 | Migration: `test_suites.visibility` (`private`\|`unlisted`\|`public`, default `private`) | done |
| V2-P5-T03 | Migration: replace admin-only RLS policy with owner-or-admin write, visibility-aware read — on `test_suites` AND `test_suite_items`/`test_suite_item_steps` (access derived from parent suite via `suite_id`, same pattern as `test_plan_cases` deriving from `test_plans`) | done |
| V2-P5-T04 | `types/domain.ts`: add `ownerId`, `visibility` to `TestSuite` | done |
| V2-P5-T05 | `testSuiteRepository.ts` / `testSuiteService.ts`: `create`/`update` accept `visibility` (default `'private'`); ownership itself is enforced by RLS (`owner_id` defaults to `auth.uid()`), not duplicated client-side | done |
| V2-P5-T06 | `TestSuitesPage.tsx`: removed `isAdmin`-only gating on create/edit/delete (now `isOwnerOrAdmin` per-row), added visibility selector, "My Templates" vs "All Visible Templates" `SelectButton` filter. `TestSuiteDetailPage.tsx` got the same per-row ownership check for its item CRUD. Sidebar's "Test Suite" link (`AppMenu.tsx`) was also admin-gated — opened to all users | done |
| V2-P5-T07 | Regression: `cloneItemsToProject` unchanged — confirmed via `tsc`/lint, needs a staging smoke-test pass like Phases 3/4 | todo |

**Exit criteria:** any user can create a private Test Suite Template; publishing it
public makes it visible/cloneable by others, without admin involvement.

**Migration file:** `supabase/migrations/20260725000010_test_suite_ownership_and_visibility.sql`.
Not yet independently smoke-tested on staging — recommend testing alongside Phase 3/4's
migrations before merging to main.

---

## Phase 6 — Minimal Public Identity Lookup

**Rescoped 2026-07-25** against `PRODUCT_CONSTITUTION.md`: this is *not* a portfolio or
showcase page. Testify is explicitly not a social network. The only job of `/@username`
is to be a resolvable identity — useful when inviting a collaborator (Phase 4) or
verifying who owns a project. No public project list, no public Test Suite list, no
contributions/statistics.

| ID | Task | Status |
|---|---|---|
| V2-P6-T01 | Route `/@:username` → `PublicProfilePage` (display name, avatar, bio — nothing else) | done |
| V2-P6-T02 | `profileService.getByUsername(username)` — public fields only, no email leak | done |
| V2-P6-T03 | Username picker/typeahead component reused by Phase 4's invite UI (resolve username → profile id) | todo |

**Exit criteria:** looking up `/@username` shows a minimal identity card; inviting a
collaborator by username in Phase 4's UI resolves correctly against it.

---

## Phase 7 — Golden-Path Acceptance Walkthrough + Docs Sync

Mandatory closing phase. Not "polish" — this is the actual MVP acceptance test defined
by the Constitution.

| ID | Task | Status |
|---|---|---|
| V2-P7-T01 | Manual walkthrough as a brand-new user: register → create project → invite a second account → write test cases → build a test plan → execute a run → record results → create an issue from a failed result. Time it — must be achievable well under an hour by someone already familiar with the UI | todo |
| V2-P7-T02 | Full regression pass across Testing Context (test cases/plans/runs/results/issues) — confirm zero behavior change per ARCHITECTURE_V2 "Testing Domain unchanged" guarantee | todo |
| V2-P7-T03 | Update `CLAUDE.md`, `docs/PRD.md`, `FEATURES.md` to reflect the shipped V2 model (mark ARCHITECTURE_V2 as the current architecture, fold key parts into ARCHITECTURE.md or cross-link) | todo |
| V2-P7-T04 | Update `TODO.md` — clear V2 roadmap items, resume normal sprint board | todo |

**Exit criteria:** the 9-step MVP Success Criteria flow works end-to-end for a fresh
account with no admin intervention anywhere in the flow; docs describe the shipped
model as current, not proposed.

---

## Explicitly out of scope (deferred or rejected — see `ARCHITECTURE_V2.md` §9)

- Organizations/Workspaces (tables + UI) — deferred, schema-ready only
- Test Suite Template forking/lineage (`forked_from_id`), versioning — deferred
- Notifications (in-app or email) — deferred
- Visibility on Issues/Attachments independent of parent Project — deferred
- Public project/suite showcase, contributions, statistics on profile pages —
  **rejected**, conflicts with the Constitution's "not a social network" stance
- Go backend (`backend/`) — paused, see `backend/README.md`

Do not schedule any of the deferred items without a fresh scoping pass against
`PRODUCT_CONSTITUTION.md`'s Feature Acceptance Rule first.
