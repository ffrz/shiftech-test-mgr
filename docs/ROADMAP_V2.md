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
| P8 | Collaboration & workflow (Comment/Activity/Notification/Attachment/Bulk Action/Saved Filter/My Work/Audit Log) | New track, not on the original golden path — see Phase 8 section below | P1–P7 |

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
Applied and verified on staging together with Phases 4/5's migrations — see the combined
verification report noted at the end of Phase 5 below. Phase fully closed.

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
Applied and verified on staging — see combined verification report at the end of Phase 5.
Phase fully closed at the RLS/code level; the actual two-account accept/decline click-through
is deferred to Phase 7's golden-path walkthrough (needs two real browser sessions, not
CLI-verifiable).

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
| V2-P5-T07 | Regression: `cloneItemsToProject` unchanged — confirmed via `tsc`/lint AND staging verification (below) | done |

**Exit criteria:** any user can create a private Test Suite Template; publishing it
public makes it visible/cloneable by others, without admin involvement.

**Migration file:** `supabase/migrations/20260725000010_test_suite_ownership_and_visibility.sql`.

**Combined staging verification (Phases 3, 4, 5 + the Phase 1 realtime-publication fix)
— all clean, no discrepancies.** Applied migrations 007–010 (four total — 008 was the
realtime-publication fix from Phase 1's verification pass, applied here since
`supabase db push` runs all pending migrations sequentially) against the same Supabase
cloud project used for Phase 1. 35 checks passed: `owner_id`/`owner_type`/`visibility`
backfilled and constrained correctly on both `projects` and `test_suites`; all RLS
helper functions (`has_project_access`, `is_project_manager`, all four capability
helpers) correctly require `status='accepted'` with the owner-safety-net intact;
`project_members` invite/respond RLS policies correct; `test_suite_items`/
`test_suite_item_steps` correctly derive access from their parent suite via a two-hop
join; 81 RLS policies total inventoried with no duplicates/conflicts; `tsc`/lint clean.
One thing **could not** be verified from the CLI: the actual two-account click-through
of invite → accept → gained-access, and non-member visibility of a public/unlisted
project, since both need two real authenticated browser sessions. Both are correct by
code/RLS inspection and are the first two checks in Phase 7's golden-path walkthrough
below — that's where they get their final confirmation.

---

## Phase 6 — Minimal Public Identity Lookup

**Rescoped 2026-07-25** against `PRODUCT_CONSTITUTION.md`: this is *not* a portfolio or
showcase page. Testify is explicitly not a social network. The only job of `/@username`
is to be a resolvable identity — useful when inviting a collaborator (Phase 4) or
verifying who owns a project. No public project list, no public Test Suite list, no
contributions/statistics.

> **Extended in Phase 7 (2026-07-29):** `PublicProfilePage` now also lists the user's
> Project/Test Suite that are `visibility` `public` or `unlisted` (owner sees their own
> `private` ones too) — see `V2-P7-T06` below. **Accepted and reaffirmed 2026-07-29**: as
> Testify commits to the platform direction (self-serve product), a resolvable identity that
> shows what a user has actually built/shared is a functional need, not scope creep — still
> no likes/follows/comments/activity feed/stats, so the Constitution's "not a social network"
> boundary holds. The "no project/suite list" line immediately below is superseded — kept only
> as historical record of the original Phase 6 scoping call.

| ID | Task | Status |
|---|---|---|
| V2-P6-T01 | Route `/@:username` → `PublicProfilePage` (display name, avatar, bio — nothing else) | done, extended by V2-P7-T06 |
| V2-P6-T02 | `profileService.getByUsername(username)` — public fields only, no email leak | done |
| V2-P6-T03 | `components/ui/UsernamePicker.tsx` — debounced typeahead over `profileService.search()` (new: partial-match on username/display_name, sanitized against PostgREST `.or()` filter injection). Replaces `ProjectSettingsPage`'s old "load every approved user" dropdown — also deleted that page's now-unused `userService.listAll()` + `profileService.getByIds()` fetch, a nice simplification since search-on-demand doesn't need it | done |

**Exit criteria:** looking up `/@username` shows a minimal identity card; inviting a
collaborator by username in Phase 4's UI resolves correctly against it. **Phase 6 is
now fully done** — all three tasks complete.

---

## Phase 7 — Golden-Path Acceptance Walkthrough + Docs Sync

Mandatory closing phase. Not "polish" — this is the actual MVP acceptance test defined
by the Constitution. **Prerequisites met:** Phases 1–6 are all `done`, and migrations
005–010 have all passed staging verification with zero discrepancies (see the
verification notes under Phase 1 and Phase 5 above).

| ID | Task | Status |
|---|---|---|
| V2-P7-T01 | Golden-path walkthrough (see step-by-step checklist below) | **done (2026-07-29) via manual smoke test** — not the full two-real-account click-through originally scoped; detailed per-feature coverage deferred to dogfooding (below), which supersedes the formal checklist as the ongoing acceptance method |
| V2-P7-T02 | Full regression pass across Testing Context (test cases/plans/runs/results/issues) — confirm zero behavior change per ARCHITECTURE_V2 "Testing Domain unchanged" guarantee | **done (2026-07-29) via manual smoke test** — same caveat as T01, detailed coverage deferred to dogfooding |
| V2-P7-T03 | Update `CLAUDE.md`, `AGENTS.md`, root `README.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md`, `FEATURES.md`, `TODO.md` to reflect the shipped V2 model | done (2026-07-28, refreshed 2026-07-29) — cross-links added, ARCHITECTURE.md/PRD.md sections marked "superseded" with pointers to ARCHITECTURE_V2 rather than fully rewritten (Testing Domain sections there are untouched and still accurate). Also caught and fixed drift beyond V2 scope: notifications (this doc's §1 said "deferred entirely, don't build a stub table" — a full notification stack shipped anyway for the invite/remove lifecycle, see migration `20260728000001`), `test_roles` master table replacing free-text `target_role`, Testify rebrand, `landing/`+`public-docs/`+`deploy/` undocumented, `backend/` far more built-out than "empty" |
| V2-P7-T04 | Update `TODO.md` — clear V2 roadmap items, resume normal sprint board | todo — held until the first dogfooding round below lands, so gaps found while dogfooding get captured before the roadmap items are cleared |
| V2-P7-T05 | Merge `feature/platform-foundation` → `master` (only after T04) | todo |
| V2-P7-T06 | `PublicProfilePage` gets a portfolio-lite view: `components/profile/ProfileView.tsx` (reused by `UserDetailPage` for admin) renders the profile's own Project/Test Suite lists, filtered to `public`/`unlisted` visibility for non-owners (`private` included only when viewing your own profile); `projectRepository`/`testSuiteRepository` gained `findByOwner`, `projectService`/`testSuiteService` gained `listByOwner`. Admin viewing someone else's profile gets an `isSpying` flag surfaced in the UI. **Decision reaffirmed 2026-07-29**: accepted as intentional platform-direction scope, not creep — see the Phase 6 note above | done |
| V2-P7-T07 | Delete Account + auto-reactivation: `SettingsPage.tsx` Danger Zone → RPC `delete_account()` (hard-deletes owned projects/suites, anonymizes `users`/`profiles`); returning user with a `deleted_at` account gets auto-restored via RPC `reactivate_account()` on next Google login (`useAuth.tsx`). Also fixed a real security gap found along the way: `has_project_access()` never checked `is_approved()`, so a soft-deleted account (pre-hard-delete model) kept project access — see `20260729000003_fix_soft_delete_security.sql` | done |
| V2-P7-T08 | **Dogfooding** — build out a real Test Suite/Test Plan/Test Case set for Testify itself, inside Testify, and use Test Runs to do detail-level acceptance testing going forward. Replaces the one-off manual walkthrough checklist below as the standing acceptance method (repeatable every release, not a one-time click-through) | todo — see checklist below |

### V2-P7-T01/T02 — original walkthrough checklist (superseded by T08 dogfooding)

Kept for reference as the scope T01/T02's smoke test covered at a high level. The
two-real-account click-through and step-by-step timing below were **not** run exactly as
written — a manual smoke test stood in for it (2026-07-29). Detailed, repeatable coverage
of each step is now expected to come from the dogfooding Test Plan (T08), not from
re-running this checklist.

- [x] **1. Register** — Account A signs in with Google for the first time, lands directly
      in the app (no admin approval step, no pending screen)
- [x] **2. Create a project** — Account A creates a project from `/projects`, sets
      visibility (try `private`), confirms it appears with correct owner
- [x] **3. Invite a team member** — Account A opens Project Settings → Members → Invite,
      searches Account B by username (via `UsernamePicker`), sends invite
      - [x] Account B does **not** yet have access to the project (try navigating to it directly)
      - [x] Account B sees the invite on their Home dashboard ("Pending Invitations")
      - [x] Account B accepts → gains access immediately (no refresh/relogin needed)
- [x] **4. Write test cases** — Account A (or B, once accepted) creates a Module, then a
      few Test Cases under it
- [x] **5. Organize into a test plan** — create a Test Plan, add the test cases to it
- [x] **6. Execute testing** — start a Test Run from the plan
- [x] **7. Record results** — mark at least one result Pass and one Fail
- [x] **8. Create an issue** — from the Fail result, create an Issue, confirm it links back
      to the test result
- [x] **9. Timing** — total elapsed time from step 1 to step 8 is well under one hour for
      someone already familiar with the UI (this is a sanity check on complexity, not a
      strict stopwatch requirement for a first-time user)

### V2-P7-T08 — Dogfooding checklist

- [ ] Create a "Testify" project inside Testify (or reuse an existing one), add Modules per
      domain area: Auth, Project, Test Suite, Test Plan/Run/Result, Issue, Settings/Profile,
      Membership/Notification
- [ ] Write Test Cases for the Constitution's 9-step golden path (register → create project
      → invite → test case → test plan → test run → record result → create issue → timing)
      — this becomes the repeatable version of the walkthrough above
- [ ] Write Test Cases for features shipped 2026-07-29 that have no test coverage yet:
      Delete Account + auto-reactivation, `/@username` portfolio-lite (public/unlisted
      Project/Test Suite lists), owner-lock in Members tab, the auth race-condition fix
      (`loadProfile` + explicit session)
- [ ] Run the first Test Run from the Test Plan above, record PASS/FAIL — any FAIL becomes
      a real Issue in this project (full dogfood loop: bugs found via manual testing get
      tracked through Testify's own Issue module, not a side document)

Bonus checks worth doing in the same pass since the accounts are already set up:
- [ ] Visit `/@<account-b-username>` — confirm identity card plus their public/unlisted
      Project and Test Suite lists (private ones excluded since you're not the owner)
- [ ] Account A creates a Test Suite Template, publishes it `public`, Account B can see and
      clone it into their own project
- [ ] Account B (non-admin) can create their own project and Test Suite Template without
      any admin involvement anywhere

**Exit criteria:** the 9-step MVP Success Criteria flow works end-to-end for a fresh
account with no admin intervention anywhere in the flow; docs describe the shipped
model as current, not proposed.

---

## Backlog — captured, not yet scoped or scheduled

Raised during Phase 7's manual walkthrough (2026-07-25). Unlike "Explicitly out of
scope" below, these haven't been through a scoping decision yet — they need discussion
before becoming real roadmap tasks. Listed here so they don't get lost, not as a
commitment to build them as described.

- **Activate/deactivate user (temporary or permanent "ban").** Distinct from the
  existing soft-delete (`userService.remove` / `deleted_at`) — needs discussion on
  how it differs from delete, whether it's reversible, and what happens to a
  deactivated user's existing project memberships/content in the meantime.
- **Search/browse Test Suite Templates by category.** See the metadata brainstorm
  below — likely the same underlying feature, needs the metadata model settled first
  before a search/filter UI makes sense.
- **`TestSuitesPage` filter: replace "All Visible Templates" with "Browse Templates."**
  Current filter is "My Templates" vs "All Visible Templates" (mine + public/unlisted
  others'). Requested change: a "Browse Templates" view that shows **only public
  templates from other users**, excluding your own — i.e. a genuine discovery view,
  not just "everything I can see." Small, well-scoped UI change — doesn't need the
  metadata work below to ship.
- **Open question: does `TestPlanCase` need a Test Case snapshot + sync mechanism?**
  Raised 2026-07-25 — genuinely undecided, not leaning either way yet. Note this is
  **Testing Domain**, not Platform Context — out of V2's normal scope (see
  `ARCHITECTURE_V2.md`'s "Testing Domain unchanged" guarantee), listed here only
  because there's nowhere more specific yet to put a Testing Domain open question.
  Confirmed from `types/domain.ts`: `TestPlanCase` is a pure junction (`testPlanId`,
  `testCaseId`, `order` — no content columns) that always resolves through a live join
  to `TestCase`. `TestResult` already **does** snapshot Test Case content (title,
  objective, steps, expectedResult, priority — see the `TestResult` interface comment:
  "Snapshot ... so a completed run's history stays accurate even if the source test
  case is edited or archived afterwards"). The gap is the window *before* that: if a
  Test Case is edited after being added to a Test Plan but before a Test Run is
  started from it, the Test Plan silently shows the edited version, not the version
  that was actually planned/reviewed. Whether that's a real problem or a non-issue
  depends on how "living" a Test Plan is meant to be in practice — needs product
  discussion, not just a technical call. If snapshotting turns out to be wanted, it
  implies a sync mechanism too (surfacing "this test case changed since it was added
  to the plan," and a way to pull the update in deliberately rather than silently).

### Brainstorm: Test Suite Template metadata (needs discussion before scoping)

Idea: give each Test Suite Template structured metadata instead of being just a bag of
test cases, so the library becomes searchable by actual testing need rather than only
by name:

- **Category** — Authentication, CRUD, Security, Performance, etc.
- **Difficulty** — Beginner, Intermediate, Advanced.
- **Estimated execution time** — e.g. 10 min, 30 min, 2 hours.
- **Recommended application types** — Web, Mobile, Desktop, API.
- **Coverage tags** — Login, Validation, Authorization, Upload, etc.

Goal: let a user search like "CRUD template for a web app" or "smoke test for a REST
API" instead of browsing an undifferentiated list. This is the feature that would make
the built-in library feel genuinely useful rather than just a list of test cases.

Open questions to resolve before this becomes a scoped task: is this free-text tags or
a fixed taxonomy (fixed categories are easier to filter/search reliably, free tags are
more flexible but fragment quickly without curation)? Does "Coverage tags" overlap with
or replace the existing per-project `Tag` entity, or is it deliberately a separate
concept scoped to templates only? Does this schema live on `test_suites` directly or a
separate metadata table (matters for how heavy the migration is)? Worth checking
against `docs/PRODUCT_CONSTITUTION.md`'s Feature Acceptance Rule once scoped — this is
squarely a testing-improvement feature, but "Simplicity First" means the filter UI for
5 metadata dimensions needs care so Browse Templates doesn't turn into its own complex
sub-app.

---

## Phase 8 — Collaboration & Workflow (Engagement Layer)

Not part of the original V2 identity/ownership/membership redesign — a new track,
started once Phase 1–7 are done and the UI hardening pass (FilterToolbar, stat-tile
detail pages, 2026-07-30) is stable. Governed by the same Constitution Feature
Acceptance Rule as everything else. **Explicitly not a Team Chat or Social Network**
(Constitution "What Testify Is NOT") — every task below must be framed as QA workflow
traceability (who changed what, when, and why on a test artifact), not social
engagement. If a task can't be justified that way, it doesn't belong here.

**Foundation decision (2026-07-30, after codebase audit):** don't build Comment,
Activity Timeline, Notification-extension, and Attachment-generalization as four
separate features/migrations. Build one polymorphic `entity_activity` table where
Comment is just one `event_type`, plus generalize the existing issue-only
`attachments` table to polymorphic `entity_type`/`entity_id`. This reuses the existing
repository→service→hook pattern (one new module, not a new layer) and the existing
centralized `useRealtimeSync.ts` channel (add two more `.on(...)` blocks, don't build
a second realtime path). `notifications` needs **no schema change** — its `type`/
`reference_type`/`reference_id` columns are already generic; new call sites just pass
new `type` values (`comment`, `mention`, `assignment`, `status_change`).

Audit findings that shape this phase (don't re-derive, they're already confirmed):
- `notifications` (migration `20260728000001`) is realtime via `useRealtimeSync.ts`
  (postgres_changes subscription), not pure 30s polling — the `refetchInterval` on
  unread-count is a fallback only. Schema is generic enough to extend as-is.
- `attachments` (migration `20260701000013`) exists but is **issue-only** (FK
  `issue_id`, not polymorphic) — needs a migration to generalize before Test Case/
  Comment attachments can reuse it, not a second table.
- No `activity_log`, `audit_log`, or `comments` table exists yet.
- `Issue`/`TestCase`/`TestPlan`/`TestRun` in `types/domain.ts` all share `id` +
  `projectId` as their first two fields — clean fit for a polymorphic
  `entity_type`/`entity_id` reference, consistent with how `notifications.reference_type`/
  `reference_id` already works.
- Comment soft-delete decided (2026-07-30): comments get a `deleted_at` column, body
  hidden/replaced with "[deleted]" in the UI, row stays so the activity timeline has no
  gaps — same anonymize-not-hard-delete philosophy as `delete_account()`.

| ID | Task | Status |
|---|---|---|
| V2-P8-T01 | Migration: `entity_activity` table (`id`, `project_id`, `entity_type`, `entity_id`, `actor_id`, `event_type`, `payload jsonb`, `deleted_at`, `created_at`) + RLS via `has_project_access(project_id)`, same pattern as existing tables. `event_type` starts with `comment` only — system event types (`status_change`, `assignment`, `attachment_added`) added incrementally as each producer is wired in T04–T06, not all upfront | **done (2026-07-30)** — `supabase/migrations/20260730000001_entity_activity_and_attachments.sql`, pushed to remote |
| V2-P8-T02 | Migration: generalize `attachments` → `entity_attachments` (`entity_type`, `entity_id` replacing `issue_id` FK). Migrate existing rows to `entity_type='issue'`, `entity_id=issue_id`. Update storage RLS policies to resolve project via `entity_type`/`entity_id` instead of the direct `issues.project_id` join | **done (2026-07-30)** — same migration as T01 (kept as one PR per the sequencing note below). Write-gate preserved exactly for `entity_type='issue'` via new `can_write_entity_attachment()` (delegates to existing `can_manage_issues`, manager/tester only) — did **not** silently loosen to `is_approved()`, which would have been a real permission widening; other entity types fall back to `is_approved()` until T07 gives them a real gating story. `project_id` added directly to the row (not resolved via join, since `entity_id` isn't scoped to one table) |
| V2-P8-T03 | `activityService.ts` (repository→service→hook, same shape as existing 15 modules): `addComment(entityType, entityId, body)`, `editComment`, `softDeleteComment`, `logEvent(entityType, entityId, eventType, payload)`, `listForEntity(entityType, entityId)`. `addComment` parses `@username` mentions and calls `notificationService.create()` with `type='mention'` per resolved user | **done (2026-07-30)** — `frontend/src/repositories/activityRepository.ts` + `frontend/src/services/activityService.ts` + `frontend/src/hooks/useActivity.ts`. Mention resolution uses `profileRepository.findByUsername()` (exact match), not `profileService.search()` (partial-match typeahead) — wrong tool for parsing `@handle` out of comment text. Wired into `useRealtimeSync.ts` (`entity_activity` table) and `queryKeys.activity()`. `issueRepository`/`attachmentService` updated to the new `entity_attachments` shape (`upload()` now takes `projectId` — two call sites fixed: `IssueDetailPage.tsx`, `IssueEditor.tsx`). `tsc -b` clean |
| V2-P8-T04 | **Universal Comment UI** — comment thread component (input + list, soft-delete affordance for own comments) mounted on Issue/TestCase/TestPlan/TestRun detail pages, inside `detail-content-col` per the existing detail-page convention. Wire into `useRealtimeSync.ts` (`entity_activity` table) | **done (2026-07-30)** — `frontend/src/components/ui/ActivityPanel.tsx`, one shared component built to cover both T04 and T05 together (a comment is just `eventType='comment'` in the same stream a timeline reads — see rationale below). Mounted as a `Card`/`TabPanel`/`Panel` per each page's existing layout convention: `IssueDetailPage`/`TestCaseDetailPage` get a `detail-content-card` (prose pattern), `TestPlanDetailPage` gets a new "Activity" `TabPanel` (already tab-based), `TestRunResultDetailPage` gets a collapsed-by-default `Panel` scoped to the whole Test Run (not per-result — a run is one execution session, matches the domain model) |
| V2-P8-T05 | **Activity Timeline UI** — render `entity_activity` rows (comment + system events together, chronological) as a tab/section on the same 4 detail pages, not a separate log page. Wire status-change/assignment producers: `issueService`, `testRunService` (run completed), etc. call `activityService.logEvent()` at their existing mutation points | **done (2026-07-30)** — `issueService.changeStatus()`/`.assign()` and `testRunService.complete()`/`.reopen()` now take an `{ projectId, actorId }` actor argument and log `status_change`/`assignment` events (issue changeStatus only logs when the status actually changed, to avoid no-op noise). All 7 call sites across `IssueDetailPage.tsx`, `IssueTab.tsx` (3 sites incl. undo path — `applyFieldChange`/`handleUndo`/`scheduleUndoToast` all threaded an extra `projectId` param), `TestRunIssuesPage.tsx` (3 sites), and `TestRunResultDetailPage.tsx` (2 sites) updated to pass the actor from `useAuthContext()`. `test_case`/`test_plan` have no status/assignment concept yet, so no producer wiring needed there — comment is their only event type for now, which is already covered by T04. `tsc -b` + lint clean, no new warnings | 
| V2-P8-T06 | **Notification extension** — wire `comment`, `mention`, `assignment`, `status_change` into existing `notificationService.create()` call sites added in T03/T05. No schema change. Update `NotificationPanel.tsx` icon/label mapping for the new `type` values | **done (2026-07-30)** — Recipient decision (confirmed with product 2026-07-30): notifications stay **targeted to the assignee only**, not broadcast to all project members — same philosophy as `mention` (already targeted, shipped in T03). `assignment` notifies the new assignee; `status_change` notifies the current assignee (skipped if no assignee, or if actor === assignee — no self-notify). Wired into `issueService.changeStatus()`/`.assign()`, which now also accept `actorName` for a readable notification title. All `issueService.changeStatus`/`.assign` call sites (`IssueDetailPage`, `IssueTab`, `TestRunIssuesPage`) pass `actorName` from `useAuthContext().profile`. `NotificationPanel.tsx` got a `NOTIFICATION_TYPE_ICON` map (comment/mention/assignment/status_change/project_invite/project_member_removed each get a distinct `pi-*` icon, read-state still controls icon color). `AppTopbar.tsx`'s `onNotificationClick` previously always navigated to `/` regardless of type — now resolves `referenceType`/`referenceId` to the correct entity route (`/issues/:id`, `/test-cases/:id`, `/test-plans/:id`, `/test-runs/:id`) via a small `ACTIVITY_ENTITY_ROUTE` map; `project_invite`/`project_member_removed` (pre-dating entity_activity, different reference shape) keep the `/` fallback. `test_case`/`test_plan`/`test_run` have no assignee concept — `testRunService.complete()`/`.reopen()` still only call `activityService.logEvent()` (T05), not `notificationService.create()`, since there's no assignee to notify. Only `issue` emits `assignment`/`status_change` notifications for now. `tsc -b` + lint clean |
| V2-P8-T07 | **Attachment UI generalization** — extend attachment upload/list UI (currently Issue-only) to Test Case and comment bodies, using the generalized `entity_attachments` from T02 | **done (2026-07-30)** — `entityAttachmentRepository.ts` (entity-agnostic counterpart to `issueRepository`'s hardcoded-issue attachment methods) + `attachmentService.listForEntity/uploadForEntity/removeForEntity` + `AttachmentPanel.tsx` (reusable component, same shape as `ActivityPanel`). Mounted on `TestCaseDetailPage` as a new "Attachment" `Card`, gated by `canEditContent` (manager/supervisor). **Note**: UI gate (`canEditContent`) is stricter than the DB RLS gate for non-issue attachments (`is_approved()` — any accepted member, see T02's `can_write_entity_attachment()`) — this is a safe direction (UI narrower than DB), not a security gap, but worth tightening the RLS to match if/when Test Case attachment write access needs to be role-restricted like issues are. `IssueDetailPage`/`IssueEditor` intentionally left on their original `attachmentService.listByIssue/upload/remove` methods (already wired, no need to churn working code) — comment-body attachments not built (no comment editor UI supports file attachment yet; deferred, not blocking anything else in Phase 8). `tsc -b` + lint clean |
| V2-P8-T08 | **Bulk Action** on table views (multi-select rows + action bar) — independent of T01–T07, can start anytime after T01 lands if sequencing needs parallelizing. Start with the highest-traffic table (Issue list or Test Case list) | **done (2026-07-30), scope widened after user feedback** — see full breakdown below |
| V2-P8-T09 | **Saved Filter / My Views** — persist current filter state (per table, per user) as a named view. Needs a small `saved_filters` table (`user_id`, `project_id`, `entity_type`, `name`, `filter_state jsonb`) — independent of the activity/comment work | **skipped (2026-07-30), by product decision** — audit found `useStoredState` (`frontend/src/hooks/useStoredState.ts`) already persists each table's active filter combination to `localStorage` per project (e.g. `project-{id}:caseStatusFilter:v2`), auto-remembered across sessions with no user action needed. That covers "don't lose my filter" but not: multiple named views per table, filters following the account across devices/browsers (localStorage is per-browser), or sharing a view with the rest of the project (e.g. a manager's "Needs Review" view visible to the whole team). Decided the existing single-slot-per-table auto-remember is sufficient for now — named multi-view/shareable saved filters not worth the new `saved_filters` table + UI at this time. Revisit if a real need for multiple named views or team-shared views surfaces later |
| V2-P8-T10 | **Dashboard "My Work" + Activity Feed** on `HomePage` — "My Work" queries existing tables (issues assigned to me, test runs I'm testing) with no new schema; "Activity Feed" is a `listForEntity`-style query over `entity_activity` scoped to the user's projects, reusing T01's table | **done (2026-07-30)** — Scope confirmed with user: **My Work = issues assigned to me, not closed, across all projects** (not test runs — kept to the one clearest source rather than merging two different concepts into one list). **Activity Feed = latest activity across every project the user has access to** (not narrowed to mentions/assignments only — RLS already scopes it, no extra filtering needed, and a narrower "only about me" feed would have overlapped with the existing `NotificationPanel`). No new schema — both read from tables that already exist (`issues`, `entity_activity`), scoped for free by RLS (`has_project_access`) the same way `dashboardRepository`'s existing `findRecentProjects`/`findContinueWorking` already work. Added `dashboardRepository.findMyWorkIssues()`/`findRecentActivity()` + `dashboardService` wrappers + `useDashboard` queries (`dashboardMyWork(userId)`/`dashboardActivity()` query keys). **Extracted two shared helpers to avoid duplication** the user had specifically flagged as a concern in T08: `helpers/activityRoutes.ts` (`ACTIVITY_ENTITY_ROUTE`/`pathForActivityEntity` — previously duplicated inline in `AppTopbar.tsx`'s notification-click handler, now the one place entity-type-to-route mapping lives) and `helpers/activityDescribe.ts` (`describeSystemEvent` — previously a private function inside `ActivityPanel.tsx`, now shared with `HomePage`'s feed). `useRealtimeSync.ts` extended: `entity_activity` changes now also invalidate `dashboardActivity()`, `issues` changes now also invalidate the `['dashboard', 'myWork']` prefix — both feeds update live, consistent with the rest of the app. `tsc -b` + lint clean |
| V2-P8-T11 | **Audit Log (admin-only)** — filtered/unfiltered view over `entity_activity` scoped by project or globally for admins, reachable from `AdminRoute`-guarded screen. Near-free once T01/T05 exist — this is a read-only view, not a new write path | **done (2026-07-30), then redesigned same day** — see "Post-T11 redesign" note below the table. Final shape: project-scoped "Activity Log" tab on `ProjectDetailPage`, visible to any project member (not admin-only) |

**Post-T11 redesign (2026-07-30, same session, before moving on)**: shipped as an
admin-only `/audit-log` page first, per the task's original wording. User feedback:
"everyone needs this too, as a project owner I need to monitor what's happening in my
project" — the admin-only framing was wrong from the start; a project owner isn't
necessarily a platform admin, and the whole point of an activity log is for the people
who actually own/run a project to see what happened in it. Also requested: a search box
for the description column, positioned to fill the remaining row space in the filter bar
(not a fixed-width box off to the side).

Redesigned before building the search box, so it wasn't built twice:
- Moved from a standalone `/audit-log` admin page to a new **"Activity Log" tab on
  `ProjectDetailPage`** (`ActivityLogTab.tsx`), scoped to one project — access is the
  same `has_project_access` RLS as the rest of `entity_activity`, so any project member
  sees it, not just managers/owners (confirmed with user: same visibility as the
  existing per-entity "Activity" tabs, no new narrower gate).
- **Naming clarified with user mid-conversation**: user's first read was that "Activity"
  tabs were somehow mixing in whole-project activity, which would have been a real
  design failure. Clarified they're not — each entity detail page's "Activity" tab
  (Issue/TestCase/TestPlan/TestRun/Project) only ever shows that *one* entity's own
  comments/events, strictly scoped by `entity_id`. The new tab is a genuinely different
  thing: a **combined** feed across every Issue/TestCase/TestPlan/TestRun/Project entry
  in one project. Named **"Activity Log"** (not "Comments", not "Project Activity" —
  the latter risked being confused with the existing per-project "Activity" tab sitting
  right next to it) to make that distinction clear at the tab-label level.
- `auditLogRepository.ts` simplified: dropped the cross-project `projectId` filter
  (always project-scoped now, taken from the route instead of a dropdown) and the
  `projects.name` join (redundant — the tab is already inside that project's page).
  Added a `search` option using `.ilike('payload->>body', ...)` — **PostgREST JSON-path
  filter syntax, no precedent elsewhere in this codebase**, verified against the live
  Supabase REST endpoint via `curl` before relying on it (got a clean `[]`, not a parse
  error, confirming the syntax itself is accepted). Search only covers comment bodies —
  system-event descriptions ("changed status from Open to In Progress") are generated
  client-side by `describeSystemEvent()`, not stored as text, so there's nothing in the
  DB to `ilike` against for those rows; confirmed this scope with the user before
  building rather than silently shipping a partial search.
- Search box uses `SearchInput`'s existing `className` prop with `flex-1` (same pattern
  as `IssueTab.tsx`'s toolbar) so it fills the remaining row width next to the reset
  button, instead of sitting at a fixed width.
- Deleted `pages/admin/AuditLogPage.tsx`, the `/audit-log` route, and its `AppMenu.tsx`
  "Administration" entry — fully replaced, not left as a second parallel screen.

**Follow-up polish (same session, after first browsing the tab)**:
- `eventType` ("status_change", "attachment_added", ...) was rendered as its raw DB
  value in the "Event" column. Added `eventTypeLabel()` to `helpers/activityDescribe.ts`
  — a plain lookup map (`Record<string, string>`, not a closed union — `event_type` isn't
  a fixed enum in `ActivityEntry`, same reasoning as `describeSystemEvent`'s existing
  default-case fallback) so an unrecognized future event_type still renders something
  instead of breaking.
- Pagination's "Show [n]" rows-per-page dropdown didn't render any options —
  `rowsPerPageOptions` was missing from the `DataTable` (every other paginated table in
  the app passes it alongside `dataTablePaginatorProps`; this one was overlooked when
  the tab was first built). Added `[10, 20, 50, 100]`, matching `IssueTab`/
  `UserManagementPage`'s existing options.
- Entity Type filter changed from single-select `Dropdown` to `MultiSelect` (with
  `selectAll`) — `auditLogRepository.findAllByProject`'s `entityType?: string` became
  `entityTypes?: string[]` using `.in('entity_type', ...)` instead of `.eq(...)`, same
  shape as the `MultiSelect` filters used elsewhere (e.g. `IssueTab`'s status/priority
  filters).

`tsc -b` + lint clean.

### HomePage dashboard polish (2026-07-30, after T11 redesign)

- **Activity Feed limit**: 8 → 10 per user request ("jangan terlalu banyak, 10 sudah
  cukup") — `dashboardService.getRecentActivity()` default changed. User flagged a
  future simplification pass on the Activity Feed itself as a separate later
  conversation, not part of this change.
- **Quick Actions moved**: was the last section on the page (below Activity Feed,
  furthest from the fold); moved to right after "Recent Projects" (before
  "Statistics") so it's reachable without scrolling past everything else.
- **Statistics expanded from 3 to 7 cards** (`Project`/`TestPlan`/`TestCase` counts
  already existed): added `issueCount` (all issues, RLS-scoped), `openIssueCount`
  (status != 'closed' — confirmed with user: "open" here means "not yet closed," not
  literally status='open', consistent with how My Work already counts issues),
  `testSuiteOwnedCount` (**owner_id = viewing user only** — confirmed with user this is
  a single "suites I own" metric, not a second "total visible suites" number, after an
  ambiguous first read of the request), `runningTestRunCount` (status='in_progress').
  `dashboardRepository.getCounts()` gained a required `userId` parameter for the owned-
  suite count; `queryKeys.dashboardCounts()` gained a `userId` key segment to match.
  Grid changed from `md:col-4` (3-up) to `md:col-3` (4-up) to fit 7 cards without an
  awkward trailing row. Two new `stat-icon-*` CSS classes added (`green`, `indigo`) —
  the existing 5-color palette (blue/purple/teal/orange/red) was already fully assigned
  to other dashboard cards.
- All four new counts are still RLS-scoped the same way the existing counts already
  were (`has_project_access` on `issues`/`test_runs`, explicit `.eq('owner_id', ...)`
  on `test_suites`) — verified this holds under `select(..., { count: 'exact', head:
  true })` (a `head: true` count still runs through the same RLS-filtered query, it
  just skips returning rows) before relying on it, not just assumed.

`tsc -b` + lint clean.

### Post-T10 fixes and scope additions (2026-07-30, same session)

Found/requested while dogfooding the shipped Phase 8 features, before moving to T11:

- **Status labels in Activity Feed/Timeline showed raw DB values** ("changed status from
  open to in_progress") instead of the same labels used everywhere else in the UI
  ("Open" → "In Progress"). Root cause: `describeSystemEvent()` (in
  `helpers/activityDescribe.ts`, shared by `ActivityPanel` and `HomePage`) rendered
  `payload.from`/`payload.to` as-is. Fixed by resolving each raw status through the
  correct label map (`ISSUE_STATUS_LABEL`/`TEST_PLAN_STATUS_LABEL`/
  `TEST_CASE_STATUS_LABEL`/`TEST_RUN_STATUS_LABEL`/`PROJECT_STATUS_LABEL`) keyed by the
  entry's `entityType` — one fix in the shared helper, so it corrected every page that
  renders activity, not just the two the user happened to notice it in.
- **Project had no Activity tab, unlike Issue/TestCase/TestPlan/TestRun** — this was an
  unintentional gap, not a decision: `entity_activity`'s original `entity_type` CHECK
  constraint (20260730000001) only covered the 4 Testing Domain entities on the golden
  path, Project was never in scope for T01. User decision: Project needs its own
  comment/activity feed too (project-level discussion, release notes, freeze
  announcements — things that don't belong to one specific Test Plan/Issue). Added via
  migration `20260730000002` (`project` added to both `entity_activity` and
  `entity_attachments` CHECK constraints) + `ActivityEntityType` gained `'project'` +
  new "Activity" `TabPanel` on `ProjectDetailPage.tsx`, same pattern as the other 4
  pages.
- **Comments had no attachment support** — flagged as a real gap (screenshots/logs are
  core to QA discussion, a text-only comment box undersells the feature). Scoped with
  the user to **per-comment** attachments (not one shared bucket per entity) — each
  comment can have its own files, matching Slack/GitHub's model. Implementation:
  `entity_attachments.entity_type` gained a `'comment'` value in a **separate** migration
  (`20260730000003`, not folded into `20260730000002` — that file had already been
  applied to the remote database by the time this was requested, and Supabase CLI's
  migration tracking is by filename not content, so editing an already-applied file
  silently does nothing on a later `db push`; this is now a standing gotcha to remember
  for any future same-day migration edits). `entity_id` for a `'comment'`-typed
  attachment points at the parent `entity_activity.id` row, not at the Issue/TestCase/
  etc the comment lives under. New `AttachmentEntityType = ActivityEntityType |
  'comment'` type (kept separate from `ActivityEntityType` itself, since a comment can't
  itself be commented on — only `entity_attachments` needed the wider type, not
  `entity_activity`). `ActivityPanel.tsx` gained a `CommentAttachments` sub-component
  (its own query/upload/remove scoped by `entity_type='comment'` + `entity_id=commentId`)
  rendered under each non-deleted comment body, gated to the comment's own author
  (`canManage={isOwn}` — same authorship-based gate as edit/delete).

`tsc -b` + lint clean throughout, no new warnings introduced by any of the three fixes.

Sequencing note: T01+T02 (migrations) should land together since both touch the
polymorphic-entity pattern and RLS shape — reviewing them separately risks the second
migration reopening decisions the first one already made. T03 unblocks T04–T06. T08–T11
have no dependency on T01–T07 and can be pulled forward or interleaved if useful for
pacing, but are sequenced last here because they're lower-value than closing the
comment/activity/notification loop first.

### Comment editor follow-up: mention autocomplete + cross-reference (2026-07-30)

T04 shipped the comment box with a placeholder hint ("use @username to mention someone")
but no actual typeahead — `@username` mention parsing/notification already worked
server-side (T03/T06), the gap was purely UI: no dropdown while typing, and a saved
mention rendered as flat text instead of a link.

- **`MentionTextarea.tsx`** (new, `frontend/src/components/ui/MentionTextarea.tsx`) —
  detects an in-progress trigger token (`@`, `#`, `!`) immediately before the caret,
  queries the matching source, and shows a dropdown (arrow keys/Enter/Tab/Escape). Fixed
  input into `CommentEditor.tsx`, which every write/edit/reply box in `ActivityPanel.tsx`
  already goes through.
- **Extended beyond `@username`, per user request same day**: `#code` now autocompletes
  and links to a **Test Case**, `!code` to an **Issue** — both read the entity's existing
  `code` field (`TC-0001`, `ISS-0001`, ...), no new column needed. Added
  `testCaseRepository.searchByProject()`/`.findByCode()` and
  `issueRepository.searchByProject()`/`.findByCode()` (lightweight `id, code, title`
  lookups, distinct from the existing full-detail finders).
- **Dropdown background bug**: first version used PrimeFlex's `surface-overlay` utility
  class, which rendered transparent in this project's theme setup. Fixed to an explicit
  `background: var(--surface-card)` inline style — the same opaque-popup convention
  already used elsewhere in `index.css` (e.g. `.p-dialog`), not a new pattern.
- **Rendering**: `helpers/renderMentions.tsx` parses all three token kinds out of a saved
  comment body and links only the ones that resolve to a real record — an unresolved
  `@handle`/`#code`/`!code` (typo, or a code from a different context) stays plain text
  instead of becoming a dead link. `ActivityPanel.tsx` batch-resolves every token
  referenced across a thread once per render (one query per kind, not per comment).
- **Cross-project scoping verified (2026-07-30, explicit user ask)**: confirmed `#`/`!`
  mention search and resolution are project-scoped end to end, not just RLS-scoped —
  `MentionTextarea` requires a `projectId` prop and threads it into
  `testCaseRepository.searchByProject(projectId, ...)`/`issueRepository.searchByProject(projectId, ...)`
  for the typeahead, and `ActivityPanel` resolves rendered tokens via
  `findByCode(projectId, code)` — a code that exists in a *different* project simply
  doesn't resolve and renders as plain text, it can never link across projects. This was
  already correct by construction (no code change needed), verified by re-reading the
  call chain rather than assumed.
- **Per-project code uniqueness verified (2026-07-30, explicit user ask)**: confirmed
  `entity_code_sequences` (see "Kode Entity" in `FEATURES.md`) is keyed by
  `(project_id, prefix)` — `next_entity_code()` always starts a fresh counter per new
  project (`TC-0001`, `ISS-0001`, ... restart from scratch), enforced by real unique
  indexes (`idx_test_cases_project_code`, `idx_issues_project_code`, both
  `(project_id, code)`). Codes are scoped **per project, not per user** — this matches
  the domain model on purpose (a project has multiple members who must all see the same
  code for the same entity; per-user code isolation within one shared project was
  considered and explicitly not built, since it would mean two members seeing different
  codes for the same Test Case/Issue, which would break the mention feature itself and
  every other place a code is used as a shared reference).

`tsc -b` + lint clean, no new warnings.

### T08 — Bulk Action breakdown (2026-07-30)

**Scope discovery, before any code changed**: `BulkActionsBar.tsx` (multi-select + action
bar infra) already existed and was already wired into 9 tables (Issue/TestCase/TestPlan/
TestRun/Member/Module/Tag/TestRole/PlanTestCases), each with a "Delete Selected" action
only. So the task's real scope was never "build bulk action infra" — it was "add
non-delete bulk actions where they're actually useful," which the original task
description didn't capture.

**User feedback that reshaped this task (2026-07-30), both addressed**:
1. *"I want one shared component so I can update it in one place — in Issue the action
   button is on the far right, but I clicked the checkbox on the left, why do I have to
   reach across to act?"* — `BulkActionsBar.tsx` was a single already-shared component
   (all 9 call sites pass the same `selectedCount`/`onClear`/`actions` props), so this was
   a **one-file layout fix**, not a per-table migration: actions now render left (next to
   where selection happens), count + Cancel stay right as a fixed anchor. All 9 tables got
   the new layout automatically from that one change.
2. *"I want bulk actions on other tables too — Test Plan status change, Test Case
   Module/Priority/Status/Target Role."* — scoped down with the user to exactly these two,
   not all 9 tables blanket-covered:
   - **Issue**: bulk status-change + bulk assign (dropdown pair in the bar — 2 fields fit
     inline without crowding)
   - **Test Plan**: bulk status-change (single dropdown in the bar)
   - **Test Case**: bulk edit via a **"Bulk Edit" button opening a dialog** (not inline
     dropdowns — 4 fields side-by-side in the bar would crowd it on narrower screens, a
     dialog scales to any number of fields cleanly). Dialog has Module/Priority/Status/
     Target Role, each defaulting to "Unchanged" — only fields the user actually touches
     get sent to `testCaseService.bulkUpdate()`. Needed an `UNSET` sentinel (not `null`)
     per field internally, since `null` is itself a meaningful choice for Module/Target
     Role (clear the field via the Dropdown's `showClear`) and had to stay distinguishable
     from "user didn't touch this field."
   - Other 6 tables (Member/Module/Tag/TestRole/PlanTestCases/TestRun) intentionally left
     bulk-delete-only — not treated as a gap, just out of scope for this round.

**Implementation**: `issueService.bulkChangeStatus()`/`.bulkAssign()`,
`testPlanService.changeStatus()` (gained activity logging it didn't have before, for
consistency with Issue)/`.bulkChangeStatus()`, `testCaseService.bulkUpdate()` — all
sequential loops over each entity's existing single-row service method, so activity
log/notification wiring from T05/T06 comes for free per-row with no bulk-specific logging
path to maintain separately.

**Follow-up consistency pass, same session**: after Test Case's "Bulk Edit" dialog
shipped, Issue's original inline dropdown-pair (`ISSUE_STATUS_OPTIONS`/`assignedTo`
directly in the `BulkActionsBar`) was converted to the same "Bulk Edit" button → Dialog
pattern (`onBulkChangeStatus`/`onBulkAssign` props merged into one `onBulkEdit({ status?,
assignedTo? })`) — two different bulk-edit UI shapes across two tables side by side would
have undercut the whole point of extracting a shared component. Both dialogs also
adopted `ifta-field` floating labels (`FloatLabel` from `primereact/floatlabel`), matching
every other create/edit dialog's convention per CLAUDE.md — the first pass had used plain
static labels above each Dropdown, which was the one place this task didn't yet match
established form conventions. `tsc -b` + lint clean, no new warnings.

### Comment editor follow-up #2: reply, delete confirmation, Markdown, attach-before-send (2026-07-30)

Requested as a batch of UX fixes to the comment box shipped in T04 + the mention
follow-up above:

- **Delete confirmation** — deleting a comment previously called `deleteComment()`
  directly from the "Delete" link, no confirmation step. Now opens a `confirmDialog`
  ("This comment will be deleted. Continue?") first, matching the confirm-before-destroy
  convention used everywhere else in the app (issue archive/delete, attachment remove).
- **`CommentEditor.tsx` extracted** (new, `frontend/src/components/ui/CommentEditor.tsx`)
  — the write box (mention textarea + char count + submit/cancel) was duplicated three
  times inline in `ActivityPanel.tsx` (new comment, edit, and now reply). Pulled into one
  component so all three stay in sync structurally instead of drifting.
- **Markdown editor + rendered preview** — added `react-markdown` + `remark-gfm`
  dependencies. `CommentEditor` gained a Write/Preview toggle (GitHub-style, not a live
  split-pane — chosen over split-pane for narrow-width/mobile friendliness); Preview
  renders through new `MarkdownPreview.tsx` (GFM: tables, task lists, strikethrough,
  fenced code, autolinks). Saved comments render through the same component. Mention/
  cross-reference tokens (`@user`/`#code`/`!code`, from the follow-up above) still had to
  resolve to real links under Markdown rendering — solved by a new
  `linkifyMentionsMarkdown()` in `renderMentions.tsx` that rewrites resolved tokens into
  Markdown link syntax (`[@user](/@user)`) *before* handing the body to `ReactMarkdown`,
  rather than trying to post-process React output. `index.css` got scoped
  `.markdown-preview` rules (compact spacing, code block/table/blockquote styling) since
  the default Markdown output is sized for a full document, not a comment thread.
- **Reply** — one level of nesting (a reply can't itself be replied to). Went with a
  proper DB column over a JSON-payload field after explicit user ask ("which is more
  correct, by design a new DB column") — `parent_comment_id uuid references
  entity_activity(id) on delete cascade` (migration `20260730000005`), not smuggled into
  the existing `payload jsonb`. Threaded through the full stack: `ActivityEntry.parentCommentId`
  (domain type) → `mapActivityEntryRow` → `activityRepository.create()` →
  `activityService.addComment()` → `useActivity`'s `addComment` mutation, which now takes
  `{ body, parentCommentId? }` instead of a bare string (all three call sites in
  `ActivityPanel.tsx` updated). UI: replies render indented under their parent, top-level
  comments only (Reply button hidden on a reply itself, enforcing the one-level rule at
  the UI layer since the DB doesn't).
- **Attach file was missing entirely on new comments/replies** — the attach affordance
  built for T10's "comments had no attachment support" fix only worked on an *existing*
  comment being edited, because attaching requires a real `commentId` and a brand-new
  comment/reply doesn't have one until after it's saved. Fixed with a stage-then-upload
  flow: `CommentEditor` gained optional `pendingFiles`/`onPendingFilesChange` props — when
  passed, an "Attach file" button appears (uses `FileUpload` in manual/non-auto mode
  purely to grab `File` objects via `onSelect`, no actual upload happens yet) and picked
  files show as removable chips. `ActivityPanel` owns `draftFiles`/`replyFiles` state; on
  submit, `addComment()` creates the comment first, then every staged file is uploaded
  against the real new `commentId` via `attachmentService.uploadForEntity()`, then that
  comment's attachment query is invalidated so the files appear without a reload. The
  edit form intentionally does **not** get `pendingFiles` — it already has a real
  `commentId`, so it keeps uploading directly through the existing `CommentAttachments`
  sub-component instead of staging.
- **Visual pass, same session**: Write/Preview toggle buttons switched to
  `severity="secondary"` (were unstyled-primary, too visually loud next to actual content
  links). Reply/Edit/Delete action links switched from the bold-primary `.entity-link`
  class to a new muted `.comment-action-link` class (same hover affordance, no color
  competition with real content links inside the comment body). Comment/Reply/Cancel
  buttons moved from right-aligned to left-aligned (GitHub-style, action buttons near
  where the user's eye already is after typing); character counter moved to its own
  right-aligned row directly under the textarea, out of the button row. Attach-file
  button shrunk (`p-button-sm`, reduced font-size/padding) and set to `secondary`
  severity to match.
- **`getBoundingClientRect is not a function` crash** — surfaced by the reply form's
  `autoFocus`. Root cause: PrimeReact's `InputTextarea` (`autoResize` mode) reads
  `elementRef.current` inside its native `onFocus` handler, but only merges that ref to
  the actual DOM node in a `useEffect` that runs after mount — passing `autoFocus`
  straight through to the underlying `<textarea>` fires native autofocus synchronously,
  racing ahead of that effect. Fixed in `MentionTextarea.tsx` by not using the
  `InputTextarea`'s own `autoFocus` prop at all; focuses the textarea itself via
  `requestAnimationFrame` in a `useEffect` once the ref is guaranteed attached.

`tsc -b` clean throughout. Migrations `20260730000004`/`20260730000005` (see below)
pushed to remote same session.

### Issue status expanded: 5 → 8 values (2026-07-30)

`IssueStatus` widened from `open`/`in_progress`/`resolved`/`verified`/`closed` to add
`backlog`, `rejected`, `duplicate` — closer to how GitHub/Jira-style trackers actually
triage issues (a `backlog` pre-`open` state, and two additional terminal outcomes besides
"fixed and closed"). Migration `20260730000004_issue_status_expand.sql` widens the
`issues_status_check` CHECK constraint only — existing rows keep their values unchanged,
no backfill needed since every prior value is still a member of the new set.

Updated: `IssueStatus` domain type, `ISSUE_STATUS_LABEL`/`ISSUE_STATUS_SEVERITY` in
`statusLabels.ts` (`backlog`/`rejected`/`duplicate` all map to `secondary` severity, kept
visually quiet since they're not "needs attention" states like `open`), the three
hardcoded status-dropdown option arrays (`IssueDetailPage.tsx`, `IssueTab.tsx`,
`TestRunIssuesPage.tsx` — no shared constant existed for this list before, still doesn't;
worth extracting if a fourth call site appears), and `dashboardRepository`'s "open issue"
counts (`getCounts().openIssueCount`, `findMyWorkIssues()`) — both switched from
`.neq('status', 'closed')` to `.not('status', 'in', '(closed,rejected,duplicate)')` so
Rejected/Duplicate issues (terminal, same as Closed) no longer count as "open" work.

**Deliberately left unchanged**: the existing "Archive" action and the edit-lock
(`row.status !== 'closed'`, gates Edit/inline-cell-edit/Delete-vs-Archive across
`IssueDetailPage.tsx`/`IssueTab.tsx`) still key off `closed` only, not the two new
terminal states — whether Rejected/Duplicate should also lock further editing is a
separate product decision, not bundled into this status-list expansion.

`tsc -b` clean. Migration pushed to remote same session (see also
`20260730000005_entity_activity_comment_replies.sql` above — both pushed together).

---

## Explicitly out of scope (deferred or rejected — see `ARCHITECTURE_V2.md` §9)

- Organizations/Workspaces (tables + UI) — deferred, schema-ready only
- Test Suite Template forking/lineage (`forked_from_id`), versioning — deferred
- Notifications (in-app or email) — **partially built anyway**: minimal bell + panel shipped 2026-07-28 for Phase 4's invite/remove lifecycle only (see `ARCHITECTURE_V2.md` §1). Testing Domain notifications (test run/issue events) and email remain deferred.
- Visibility on Issues/Attachments independent of parent Project — deferred
- Public project/suite showcase, contributions, statistics on profile pages —
  **rejected**, conflicts with the Constitution's "not a social network" stance
- Go backend (`backend/`) — paused, see `backend/README.md`

Do not schedule any of the deferred items without a fresh scoping pass against
`PRODUCT_CONSTITUTION.md`'s Feature Acceptance Rule first.
