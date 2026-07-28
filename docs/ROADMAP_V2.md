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

| ID | Task | Status |
|---|---|---|
| V2-P6-T01 | Route `/@:username` → `PublicProfilePage` (display name, avatar, bio — nothing else) | done |
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
verification notes under Phase 1 and Phase 5 above). The only thing staging
verification could *not* confirm from the CLI — the two-account invite/accept
click-through and public/unlisted project visibility for a non-member — is exactly
what T01's walkthrough below covers. **Ready to execute T01.**

| ID | Task | Status |
|---|---|---|
| V2-P7-T01 | Golden-path walkthrough (see step-by-step checklist below) | todo — needs two real browser sessions, not agent-verifiable |
| V2-P7-T02 | Full regression pass across Testing Context (test cases/plans/runs/results/issues) — confirm zero behavior change per ARCHITECTURE_V2 "Testing Domain unchanged" guarantee | todo |
| V2-P7-T03 | Update `CLAUDE.md`, `AGENTS.md`, root `README.md`, `docs/ARCHITECTURE.md`, `docs/PRD.md`, `FEATURES.md`, `TODO.md` to reflect the shipped V2 model | done (2026-07-28) — cross-links added, ARCHITECTURE.md/PRD.md sections marked "superseded" with pointers to ARCHITECTURE_V2 rather than fully rewritten (Testing Domain sections there are untouched and still accurate). Also caught and fixed drift beyond V2 scope: notifications (this doc's §1 said "deferred entirely, don't build a stub table" — a full notification stack shipped anyway for the invite/remove lifecycle, see migration `20260728000001`), `test_roles` master table replacing free-text `target_role`, Testify rebrand, `landing/`+`public-docs/`+`deploy/` undocumented, `backend/` far more built-out than "empty" |
| V2-P7-T04 | Update `TODO.md` — clear V2 roadmap items, resume normal sprint board | todo — waiting on T01/T02 (walkthrough + regression) before clearing |
| V2-P7-T05 | Merge `feature/platform-foundation` → `master` (only after T01–T04 all pass) | todo |

### V2-P7-T01 — Golden-path walkthrough checklist

Run as two real accounts (Account A = project owner, Account B = invitee) against
staging, timing from step 1. Check off each as it passes; note any friction even if it
technically "works" — the Constitution's bar is *simple*, not just functional.

- [ ] **1. Register** — Account A signs in with Google for the first time, lands directly
      in the app (no admin approval step, no pending screen)
- [ ] **2. Create a project** — Account A creates a project from `/projects`, sets
      visibility (try `private`), confirms it appears with correct owner
- [ ] **3. Invite a team member** — Account A opens Project Settings → Members → Invite,
      searches Account B by username (via `UsernamePicker`), sends invite
      - [ ] Account B does **not** yet have access to the project (try navigating to it directly)
      - [ ] Account B sees the invite on their Home dashboard ("Pending Invitations")
      - [ ] Account B accepts → gains access immediately (no refresh/relogin needed)
- [ ] **4. Write test cases** — Account A (or B, once accepted) creates a Module, then a
      few Test Cases under it
- [ ] **5. Organize into a test plan** — create a Test Plan, add the test cases to it
- [ ] **6. Execute testing** — start a Test Run from the plan
- [ ] **7. Record results** — mark at least one result Pass and one Fail
- [ ] **8. Create an issue** — from the Fail result, create an Issue, confirm it links back
      to the test result
- [ ] **9. Timing** — total elapsed time from step 1 to step 8 is well under one hour for
      someone already familiar with the UI (this is a sanity check on complexity, not a
      strict stopwatch requirement for a first-time user)

Bonus checks worth doing in the same pass since the accounts are already set up:
- [ ] Visit `/@<account-b-username>` — confirm minimal identity card (no project/suite list)
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
