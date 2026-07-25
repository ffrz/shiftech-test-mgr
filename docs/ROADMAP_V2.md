# Roadmap — Testify Platform Evolution (V2)

Execution plan for [`ARCHITECTURE_V2.md`](./ARCHITECTURE_V2.md). Go backend track is
**paused** for the duration of this roadmap — see [`backend/README.md`](../backend/README.md).

Status legend: `todo` · `in-progress` · `done` · `blocked`

Update this file the same way as [`TASKS.md`](./TASKS.md) — flip status as work lands,
and mirror the current phase's next-up items into [`TODO.md`](../TODO.md).

---

## Phase Overview

| Phase | Goal | Depends on |
|---|---|---|
| P1 | Split `profiles` → `users` + `profiles`, public username identity | — |
| P2 | Drop approval gate, `admin` becomes ops-flag not login-gate | P1 |
| P3 | Project ownership + visibility (private/unlisted/public) | P1 |
| P4 | Project membership: invite → accept/decline flow | P1, P3 |
| P5 | Test Suite ownership + visibility (marketplace groundwork) | P1 |
| P6 | Public profile page + polish, cross-cutting QA | P1–P5 |

Each phase ships as its own PR(s) and its own `supabase/migrations/*.sql` file(s),
per existing repo convention. Do not bundle phases into one migration — each must be
independently revertable given the earlier "reversible where noted" guidance in
`ARCHITECTURE_V2.md` §7.

---

## Phase 1 — Identity Split (`users` + `profiles`)

Foundation for everything else. Riskiest phase (touches every repository that reads
`profiles` today) — do this first while the blast radius is easiest to reason about.

| ID | Task | Status |
|---|---|---|
| V2-P1-T01 | Migration: backfill `role = 'pending'` → `'user'` on current `profiles` (unblocks P2 later, safe to do now) | todo |
| V2-P1-T02 | Migration: `alter table profiles rename to users`; add `users_role_check` (`user`\|`admin`) | todo |
| V2-P1-T03 | Migration: create new `profiles` table (`id`, `username` unique, `display_name`, `avatar_url`, `bio`, timestamps) + `idx_profiles_username` | todo |
| V2-P1-T04 | Migration: backfill `profiles` row per existing `users` row — `username` from `split_part(email,'@',1)`, de-duplicate with numeric suffix on collision, `display_name` from old `full_name` | todo |
| V2-P1-T05 | Migration: RLS on new `profiles` — public `select` (`using (true)`), self-only `update` | todo |
| V2-P1-T06 | Update `handle_new_user()` trigger to insert into both `users` and `profiles` on signup (generate a default username, e.g. from email local-part + random suffix) | todo |
| V2-P1-T07 | `types/domain.ts`: split `Profile` into `User` (email/role) and `Profile` (username/displayName/avatarUrl/bio) per §3 of ARCHITECTURE_V2 | todo |
| V2-P1-T08 | `helpers/mappers.ts`: add `mapUserRow`/`mapProfileRow`, remove old combined mapper | todo |
| V2-P1-T09 | `repositories/profileRepository.ts`: split into `userRepository.ts` (email/role, admin-user-management only) + `profileRepository.ts` (public fields) | todo |
| V2-P1-T10 | Audit + fix every `.from('profiles')` call site across services/hooks/pages (testResult tester join, issue assignee join, project member join, etc.) — repoint to `profiles` (public fields) or `users` (email/role) as appropriate | todo |
| V2-P1-T11 | `useAuth.tsx` / `AuthProvider`: fetch both `users` row (role) and `profiles` row (identity) on session load, expose both via `useAuthContext()` | todo |
| V2-P1-T12 | Settings page: let a user view/edit their own `username`, `display_name`, `avatar_url`, `bio` | todo |
| V2-P1-T13 | Regression pass: User Management admin page still reads `email`/`role` correctly from `users` | todo |

**Exit criteria:** app builds, lints, and every existing feature (test runs, issues,
project members list) still renders tester/assignee names correctly after the split.

---

## Phase 2 — Drop Approval Gate

| ID | Task | Status |
|---|---|---|
| V2-P2-T01 | Confirm `role = 'pending'` fully backfilled from V2-P1-T01 (no remaining `pending` rows) | todo |
| V2-P2-T02 | Drop `is_approved()` SQL function and all policies referencing it; replace call sites with direct `is_admin()` or no gate at all, per table | todo |
| V2-P2-T03 | `ProtectedRoute.tsx`: remove the `pending` branch/redirect — login success is sufficient | todo |
| V2-P2-T04 | `AdminRoute.tsx`: narrow scope — confirm it now only gates genuinely admin-ops screens (global user list, moderation), not general app access | todo |
| V2-P2-T05 | `UserManagementPage.tsx`: remove "approve/reject" actions tied to `pending`; keep promote/demote `user`↔`admin` and soft-delete | todo |
| V2-P2-T06 | Update `CLAUDE.md` Auth & RBAC section to describe self-serve signup instead of pending/approval flow | todo |

**Exit criteria:** a brand-new Google sign-in lands directly in the app with a
usable account — no admin action required.

---

## Phase 3 — Project Ownership + Visibility

| ID | Task | Status |
|---|---|---|
| V2-P3-T01 | Migration: `projects.owner_type` (`check in ('user')`, default `'user'`), `projects.owner_id` (FK `profiles`) | todo |
| V2-P3-T02 | Migration: backfill `owner_id` from earliest `manager` in `project_members` per project | todo |
| V2-P3-T03 | Migration: `alter column owner_id set not null` once backfilled | todo |
| V2-P3-T04 | Migration: `projects.visibility` (`private`\|`unlisted`\|`public`, default `private`) + partial index on `public` | todo |
| V2-P3-T05 | Migration: update `projects` select RLS — public/unlisted readable without membership, private requires `has_project_access()` | todo |
| V2-P3-T06 | `types/domain.ts`: add `ownerId`, `ownerType`, `visibility` to `Project` | todo |
| V2-P3-T07 | `projectRepository.ts` / `projectService.ts`: include new fields in create/update/mappers | todo |
| V2-P3-T08 | `ProjectsPage.tsx` create/edit form: add visibility selector (default Private) | todo |
| V2-P3-T09 | Project list/detail: show owner (username) and a visibility badge | todo |
| V2-P3-T10 | Decide + implement: does the Projects list show public projects owned by others, or only "my projects"? (needs a product call — flag for user before building) | blocked |

**Exit criteria:** creating a project sets an owner and a visibility; existing
projects all have a valid owner post-migration.

---

## Phase 4 — Membership Invite/Accept Flow

| ID | Task | Status |
|---|---|---|
| V2-P4-T01 | Migration: `project_members.status` (`invited`\|`accepted`\|`declined`, default `'accepted'` for existing rows), `invited_by`, `invited_at`, `responded_at` | todo |
| V2-P4-T02 | Migration: rewrite `has_project_access()` to require `status = 'accepted'` (or project owner) | todo |
| V2-P4-T03 | Migration: add RLS policy so an invitee can see + respond to their own `invited` row (`user_id = auth.uid()`) even without project access | todo |
| V2-P4-T04 | `types/domain.ts`: add `status`, `invitedBy`, `invitedAt`, `respondedAt` to `ProjectMember` | todo |
| V2-P4-T05 | `projectMemberRepository.ts`: `invite(projectId, username, role)` (resolve username → profile id), `accept(memberId)`, `decline(memberId)`, `listPendingInvitationsForCurrentUser()` | todo |
| V2-P4-T06 | `projectMemberService.ts`: validation — can't invite an existing accepted member twice, only manager/owner can invite | todo |
| V2-P4-T07 | New hook `useProjectInvitations` (current user's pending invites) | todo |
| V2-P4-T08 | Project Members tab: invite-by-username input, pending/accepted sections, revoke pending invite | todo |
| V2-P4-T09 | New UI surface for "My Invitations" (e.g. notification bell or dedicated page) — accept/decline actions | todo |
| V2-P4-T10 | Update `handle_new_project()` trigger — creator becomes owner (not just first `manager` member); decide if creator still also gets an auto `accepted` `project_members` row for role purposes | todo |

**Exit criteria:** inviting a user by username puts them in a pending state; they
must accept before `has_project_access()` grants them anything.

---

## Phase 5 — Test Suite Ownership + Visibility

| ID | Task | Status |
|---|---|---|
| V2-P5-T01 | Migration: `test_suites.owner_id` (FK `profiles`) — decide backfill owner for existing global suites (ask which admin account, or introduce one interim "Testify" system profile) | blocked |
| V2-P5-T02 | Migration: `test_suites.visibility` (`private`\|`unlisted`\|`public`, default `private`) | todo |
| V2-P5-T03 | Migration: replace admin-only RLS policy with owner-or-admin write, visibility-aware read | todo |
| V2-P5-T04 | `types/domain.ts`: add `ownerId`, `visibility` to `TestSuite` | todo |
| V2-P5-T05 | `testSuiteRepository.ts` / `testSuiteService.ts`: scope create to current user as owner; validation for visibility changes | todo |
| V2-P5-T06 | Test Suites page: remove admin-only gating, add visibility selector, "My Suites" vs "Public Suites" views | todo |
| V2-P5-T07 | Regression: existing `cloneItemsToProject` flow still works unchanged for owned/public suites | todo |

**Exit criteria:** any user can create a private Test Suite; publishing it public
makes it visible/cloneable by others, without admin involvement.

---

## Phase 6 — Public Profile Page + Cross-Cutting Polish

| ID | Task | Status |
|---|---|---|
| V2-P6-T01 | Route `/@:username` → `PublicProfilePage` | todo |
| V2-P6-T02 | `profileService.getByUsername(username)` — public fields only, no email leak | todo |
| V2-P6-T03 | Public profile: display name, avatar, bio, list of that user's public projects | todo |
| V2-P6-T04 | Public profile: list of that user's public Test Suites | todo |
| V2-P6-T05 | Full regression pass across Testing Context (test cases/plans/runs/results/issues) — confirm zero behavior change per ARCHITECTURE_V2 "Testing Domain unchanged" guarantee | todo |
| V2-P6-T06 | Update `CLAUDE.md`, `docs/PRD.md`, `FEATURES.md` to reflect the shipped V2 model (mark ARCHITECTURE_V2 as the current architecture, fold key parts into ARCHITECTURE.md or cross-link) | todo |
| V2-P6-T07 | Update `TODO.md` — clear V2 roadmap items, resume normal sprint board | todo |

**Exit criteria:** `testify.dev/@username` (or local equivalent) renders a real
public profile; docs reflect the new architecture as current, not proposed.

---

## Explicitly deferred (not in any phase above)

Per `ARCHITECTURE_V2.md` §9 — do not schedule these without a fresh scoping pass:

- Organizations/Workspaces (tables + UI)
- Test Suite forking/lineage (`forked_from_id`), versioning
- Notifications (in-app or email)
- Visibility on Issues/Attachments independent of parent Project
- Public contribution/statistics surfaces on profile pages
- Go backend (`backend/`) — paused, see `backend/README.md`
