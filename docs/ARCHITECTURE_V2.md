# Testify Platform Evolution — Architecture Redesign

Status: **Approved — executing.** See [`docs/ROADMAP_V2.md`](./ROADMAP_V2.md) for the phased rollout and task breakdown.
Scope: Platform Context redesign only. Testing Context (Project → Module → Test Case → Test Plan → Test Run → Test Result → Issue → Attachment) is preserved as-is; see [Testing Domain](#testing-domain-unchanged) for what stays untouched and why.

> **Governed by [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md).** Every decision
> in this document must trace back to a Core Feature or the MVP Success Criteria in that file.
> Testify is explicitly **not** a social network — see the "revised 2026-07-25" note below for
> the one place that changed as a result of re-checking against the Constitution.

> **Go backend (`backend/`) is PENDING.** This redesign and its MVP are executed entirely on
> the existing Supabase-backed frontend. The custom Go backend (see [`backend/README.md`](../backend/README.md))
> is deliberately paused until this Platform Evolution MVP ships — see §8 for why the
> architecture still keeps that door open without building toward it now.

Decisions locked in during discussion (2026-07-25):
- Drop global admin-approval gate (`profiles.role = pending`) — signup becomes self-serve, GitHub-style.
- Organizations: schema-ready only, not built in this MVP.
- Test Suite Templates: user-owned + visibility, clone-only (no fork lineage yet). Called
  "Test Suite Templates" per the Constitution's Core Features list, not "marketplace" —
  the mechanics (owner, visibility, clone) are the same, the framing is deliberately toned down.
- Membership: full Invite → Pending → Accepted → Member flow, built now (not deferred).

**Revised 2026-07-25 against `PRODUCT_CONSTITUTION.md`:** the original brainstorm framed public
profiles as a GitHub-style portfolio page (public projects list, public suites list,
contributions/statistics). The Constitution explicitly rejects "Social Network" as a category
and frames Community narrowly (register, personal projects, invite collaborators, share Test
Suite templates) — nothing about showcasing. Public profile is scoped down to **functional
identity only**: username + display name + avatar, used so collaborators can find/invite each
other and so names render correctly across the app. A bare `/@username` lookup page (name,
avatar, bio — no project/suite showcase) is kept for Phase 6 because it doubles as the
"invite by username" target-picker UI; it is not a portfolio feature. See §9 and ROADMAP_V2
Phase 6 for the current scope.

---

## 1. Entity-by-entity disposition

| Entity | Disposition | Reasoning |
|---|---|---|
| `profiles` | **Split** → `users` (Platform, auth-bound) + `profiles` (Platform, public identity) | Today `profiles` conflates "the authenticated account" with "public identity." Email must never be public (Design Principle 1), so it can't live on the same row that's joined into public pages. |
| — (new) `users` | **Introduce** | 1:1 with `auth.users`. Holds `email` (private), `role` (platform-ops flag, not an approval gate), timestamps. Never selected by public-profile queries. |
| — (new) `profiles` (redefined) | **Introduce** (reuses the name, new shape) | Public identity: `username` (globally unique, immutable-ish), `display_name`, `avatar_url`, `bio`. 1:1 with `users`. This is what `testify.dev/@username` renders. |
| `projects` | **Modify** | Add `owner_id` (nullable-shaped for future org ownership, see §4), `visibility` (`private`\|`unlisted`\|`public`). Stays in Testing Context — visibility is a Platform *concern* expressed as a column, not a reason to move the table. |
| `project_members` | **Modify** | Add `status` (`invited`\|`accepted`\|`declined`), `invited_by`, `invited_at`, `responded_at`. Move conceptually to **Platform Context** (membership/invitation is platform machinery, not testing logic) but keep the FK to `projects` — see §5 on why it doesn't need to physically move tables. |
| — (new) `project_invitations` | **Not introduced as a separate table** | Considered splitting invite-state into its own table; rejected — `project_members` with a `status` column is simpler, avoids a two-table dance for one row's lifecycle, and RLS already keys off `project_members`. Revisit only if invitations need their own audit trail independent of membership (e.g. re-inviting after decline). |
| `test_suites` | **Modify** | Add `owner_id` (references `profiles`), `visibility` (`private`\|`unlisted`\|`public`). Drop the implicit "admin-managed" assumption — any user can create one. Stays clone-only (no `forked_from_id` yet, per your call). Constitution calls this domain "Test Suite Templates" — kept as a sharing/reuse mechanic, not framed as a marketplace/store. |
| `test_suite_items`, `test_suite_item_steps` | **Keep** | No change — still per-suite content, unaffected by ownership change. |
| `test_case_steps`, `modules`, `tags`, `test_roles` | **Keep** | Pure Testing Context, no coupling to auth beyond `has_project_access()`, which is unaffected. |
| `test_plans`, `test_plan_cases`, `test_runs`, `test_results`, `test_result_steps` | **Keep** | Testing Context, no changes. |
| `issues`, `attachments` | **Keep** for MVP; visibility inheritance **deferred** | Design Principle 7 lists Issues/Attachments as future visibility-aware resources. Not required for MVP since they're always inside a project, and project visibility already gates them via `has_project_access()`. Revisit only if issues need to be independently public (e.g. public bug tracker) — out of scope now. |
| `entity_code_sequences` | **Keep** | Internal bookkeeping, untouched. |
| — (new) `organizations` | **Deferred, schema-ready only** | See §4. Not created in this MVP; `projects.owner_id` is shaped so it can be repointed later without a breaking migration. |
| — (new) `notifications` | **Built anyway, scoped minimal** — originally planned as deferred here, but shipped 2026-07-28 (`20260728000001_notifications.sql`) once Phase 4's invite/accept flow needed a way to surface "you were invited" / "you were removed" to the invitee | Two types only: `project_invite`, `project_member_removed`, created client-side via a `create_notification()` security-definer RPC (not a DB trigger) from `projectMemberService`. UI: bell + unread badge in `AppTopbar`, a `NotificationPanel` slide-out, polled every 30s (not realtime-pushed despite the table being in the realtime publication). No notification exists yet for Testing Domain events (test run completed, issue created, etc.) — that part of the original deferral still holds. |

---

## 2. Updated ERD

```mermaid
erDiagram
    USERS ||--|| PROFILES : "has public identity"
    PROFILES ||--o{ PROJECTS : owns
    PROFILES ||--o{ PROJECT_MEMBERS : "is member of"
    PROFILES ||--o{ TEST_SUITES : owns
    PROJECTS ||--o{ PROJECT_MEMBERS : has
    PROJECTS ||--o{ MODULES : has
    PROJECTS ||--o{ TAGS : has
    PROJECTS ||--o{ TEST_CASES : has
    PROJECTS ||--o{ TEST_PLANS : has
    TEST_SUITES ||--o{ TEST_SUITE_ITEMS : contains
    TEST_SUITE_ITEMS -.->|clone into| TEST_CASES
    TEST_PLANS ||--o{ TEST_PLAN_CASES : scopes
    TEST_CASES ||--o{ TEST_PLAN_CASES : "included in"
    TEST_PLANS ||--o{ TEST_RUNS : executes
    TEST_RUNS ||--o{ TEST_RESULTS : produces
    TEST_CASES ||--o{ TEST_RESULTS : "snapshot of"
    TEST_RESULTS ||--o{ TEST_RESULT_STEPS : has
    TEST_RESULTS ||--o{ ISSUES : "linked via junction"
    ISSUES ||--o{ ATTACHMENTS : has

    USERS {
        uuid id PK
        text email
        text role "platform-ops flag"
        timestamptz created_at
    }
    PROFILES {
        uuid id PK "FK to users.id"
        text username UK "globally unique"
        text display_name
        text avatar_url
        text bio
    }
    PROJECTS {
        uuid id PK
        uuid owner_id FK "-> profiles, nullable for future org"
        text owner_type "'user' (future: 'organization')"
        text name
        text visibility "private|unlisted|public"
        text status
    }
    PROJECT_MEMBERS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK "-> profiles"
        text role "manager|supervisor|tester|member"
        text status "invited|accepted|declined"
        uuid invited_by FK
        timestamptz invited_at
        timestamptz responded_at
    }
    TEST_SUITES {
        uuid id PK
        uuid owner_id FK "-> profiles"
        text visibility "private|unlisted|public"
        text name
    }
```

---

## 3. Updated Domain Model (TypeScript shape)

```ts
// Platform Context
export type PlatformRole = 'user' | 'admin'; // no more 'pending' — see §6

export interface User {
  id: string;
  email: string;           // private, never joined into public views
  role: PlatformRole;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Profile {
  id: string;               // = User.id
  username: string;         // globally unique, public
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProjectVisibility = 'private' | 'unlisted' | 'public';
export type OwnerType = 'user'; // widen to 'user' | 'organization' when orgs ship

export type ProjectMemberStatus = 'invited' | 'accepted' | 'declined';
export type ProjectMemberRole = 'manager' | 'supervisor' | 'tester' | 'member';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  status: ProjectMemberStatus;
  invitedBy: string | null;
  invitedAt: string;
  respondedAt: string | null;
  createdAt: string;
}

// Testing Context (unchanged fields shown; visibility/ownership bolted onto Project)
export interface Project {
  id: string;
  ownerId: string;
  ownerType: OwnerType;
  name: string;
  description: string | null;
  visibility: ProjectVisibility;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type TestSuiteVisibility = 'private' | 'unlisted' | 'public';

export interface TestSuite {
  id: string;
  ownerId: string;          // was: none (global/admin-only)
  visibility: TestSuiteVisibility;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Everything below `TestSuite` (`TestSuiteItem`, `Module`, `Tag`, `TestCase`, `TestPlan`, `TestRun`, `TestResult`, `Issue`, `Attachment`, …) is **unchanged** from the current `domain.ts`.

---

## 4. Organization-readiness without building organizations

The vision says "avoid tightly coupling Project directly to User." The cheapest correct move: give `projects` a **polymorphic owner** now, even though only `owner_type = 'user'` is populated in this MVP.

```sql
alter table projects add column owner_type text not null default 'user' check (owner_type in ('user'));
alter table projects add column owner_id uuid not null references profiles(id);
```

When organizations ship later:
1. Add `organizations` + `organization_members` tables.
2. Widen the check constraint: `check (owner_type in ('user', 'organization'))`.
3. `owner_id` stays a bare `uuid` (no FK constraint across two possible parent tables — Postgres can't do a polymorphic FK, so integrity is enforced in the service layer, same as `Attachment.storageProvider` already does for swappable storage).

This is a **zero-downtime, additive** change later — no migration touches existing project rows. That satisfies "add organizations without breaking existing projects" directly.

---

## 5. Updated Bounded Contexts

```
Platform Context                    Testing Context
─────────────────                   ────────────────
User (auth-bound)                   Project (owner_id, visibility)
Profile (public identity)             ├─ Module
ProjectMember (invite/accept)         ├─ Tag
                                       ├─ TestRole
(future) Organization                 ├─ TestCase (+ TestCaseStep)
(future) OrganizationMember            ├─ TestPlan (+ TestPlanCase)
(future) Notification                  ├─ TestRun
                                       ├─ TestResult (+ TestResultStep)
                                       └─ Issue (+ Attachment)

                                     TestSuite (owner_id, visibility) — independent of Project
                                       └─ TestSuiteItem (+ Steps)
```

**Why `ProjectMember` is listed under Platform Context but its table stays FK'd to `projects`:** bounded contexts are about *where business rules live*, not where foreign keys point. Invitation/acceptance logic (who can invite, what "pending" means, notification-worthy state transitions) is platform-authentication-shaped reasoning, independent of test-execution rules. But `project_members` still needs a hard FK to `projects` for referential integrity — that's a database concern, not a context-boundary violation. The important rule from Design Principle 8 — "business rules inside the Testing Context must not depend on authentication implementation" — is upheld because `has_project_access()` and friends are the *only* thing Testing-Context RLS policies call; they never reason about `status = 'invited'` vs `'accepted'` directly inside Testing table policies (that logic is centralized in the helper functions, see §7).

**Why `TestSuite` is drawn independent of both contexts, touching Platform only via `owner_id`:** this directly implements Design Principle 6 ("Test Suites should be independent from Projects whenever possible. A project imports a Test Suite instead of owning the original.") — which your current `cloneItemsToProject` already does. The only gap was ownership; that's now closed.

---

## 6. Updated Database Schema (new/changed only)

```sql
-- === users (renamed from current profiles' auth-bound half) ===
-- profiles table is renamed to users; a new profiles table is created for public identity.

alter table profiles rename to users;

alter table users drop constraint if exists profiles_role_check;
alter table users add constraint users_role_check check (role in ('user', 'admin'));
-- 'pending' rows: see migration §7 step 2 for backfill before this constraint is added.

create table profiles (
  id uuid primary key references users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_username on profiles (lower(username));

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Public read: profiles are public by definition (Design Principle 2).
alter table profiles enable row level security;
create policy "public read - profiles" on profiles for select using (true);
create policy "own profile - profiles update" on profiles for update using (id = auth.uid());

-- === projects: ownership + visibility ===

alter table projects add column owner_type text not null default 'user' check (owner_type in ('user'));
alter table projects add column owner_id uuid references profiles(id);
update projects p set owner_id = (
  select user_id from project_members where project_id = p.id and role = 'manager' order by created_at limit 1
);
alter table projects alter column owner_id set not null;

alter table projects add column visibility text not null default 'private'
  check (visibility in ('private', 'unlisted', 'public'));

create index idx_projects_owner on projects (owner_id);
create index idx_projects_visibility on projects (visibility) where visibility = 'public';

-- === project_members: invite/accept lifecycle ===

alter table project_members add column status text not null default 'accepted'
  check (status in ('invited', 'accepted', 'declined'));
alter table project_members add column invited_by uuid references profiles(id);
alter table project_members add column invited_at timestamptz not null default now();
alter table project_members add column responded_at timestamptz;

-- has_project_access() must only count ACCEPTED members from here on:
create or replace function has_project_access(p_project_id uuid)
returns boolean as $$
  select is_admin()
    or exists (select 1 from projects where id = p_project_id and owner_id = auth.uid())
    or exists (
      select 1 from project_members
      where project_id = p_project_id and user_id = auth.uid() and status = 'accepted'
    );
$$ language sql security definer set search_path = public stable;

-- Public/unlisted projects are readable without membership:
create policy "public projects - select" on projects for select
  using (visibility in ('public', 'unlisted') or is_approved_reader(id));
  -- is_approved_reader() = has_project_access(), named for clarity in this policy

-- A user can see their own pending invitations (status = 'invited') to respond to them,
-- even though has_project_access() correctly excludes them from project data until accepted.
create policy "own invitations - project_members select" on project_members for select
  using (has_project_access(project_id) or user_id = auth.uid());

create policy "invitee - project_members accept/decline" on project_members for update
  using (user_id = auth.uid() and status = 'invited')
  with check (status in ('accepted', 'declined'));

-- === test_suites: ownership + visibility ===

alter table test_suites add column owner_id uuid references profiles(id);
-- backfill: existing global suites become owned by whichever admin created the system,
-- or a designated "system" profile — resolved case-by-case at migration time, see §7.
alter table test_suites alter column owner_id set not null;

alter table test_suites add column visibility text not null default 'private'
  check (visibility in ('private', 'unlisted', 'public'));

drop policy if exists "admins manage test_suites" on test_suites; -- whatever the current admin-only policy is named
create policy "owner - test_suites all" on test_suites for all
  using (owner_id = auth.uid() or is_admin())
  with check (owner_id = auth.uid() or is_admin());
create policy "public read - test_suites" on test_suites for select
  using (visibility in ('public', 'unlisted') or owner_id = auth.uid() or is_admin());
```

---

## 7. Migration Strategy

Ordered, each step independently runnable and reversible where noted.

1. **Backfill `role = 'pending'` profiles** — before dropping the pending gate, decide: auto-promote all `pending` → `user` (matches "drop the gate" decision), or leave them and let them re-auth. Recommended: `update profiles set role = 'user' where role = 'pending';` — no one is left locked out.
2. **Rename `profiles` → `users`; create new `profiles`** — run the block in §6. Backfill `username` for existing users from `email` local-part (`split_part(email, '@', 1)`), de-duplicated with a numeric suffix on collision; users can change it later from Settings.
3. **Update every FK/query that referenced old `profiles`** — repositories (`profileRepository.ts`, joins in `testResultRepository`, `issueRepository`, etc.) now join `profiles` for public display fields (`display_name`, `avatar_url`, `username`) and `users` only where `email`/`role` is genuinely needed (e.g. admin user-management screen). This is the largest mechanical part of the migration — a full-repo grep for `.from('profiles')` is required.
4. **Add `projects.owner_id` / `owner_type` / `visibility`** — backfill `owner_id` from the earliest `manager` in `project_members` per project (matches current auto-add-creator-as-manager trigger behavior).
5. **Add `project_members` invite columns; default existing rows to `status = 'accepted'`** (so current members aren't kicked out), rewrite `has_project_access()`.
6. **Add `test_suites.owner_id` / `visibility`** — backfill owner to a real admin account (ask which one before running) or introduce one designated "Testify" system profile as interim owner, since suites were never user-scoped before.
7. **Frontend**: new `useProfile`/`useUser` split in hooks, `AuthProvider` reads both, `ProtectedRoute` drops the `pending` branch, new invite-accept UI on project member list, ownership badge + visibility selector on Project create/edit, Test Suite create/edit gets an owner+visibility picker instead of admin-only gating.
8. **Route guard cleanup**: `AdminRoute` narrows from "gate everything" to "gate only genuinely admin-ops screens" (e.g. platform-wide user list), since regular users no longer need approval to use the app.

Each step ships as its own `supabase/migrations/*.sql` file, consistent with existing convention (see `supabase/migrations/` for numbering).

---

## 8. API Boundary Proposal (for the future Go backend)

Design Principle 9 requires the Testing Domain to survive a backend swap. The repository layer already isolates Supabase calls (per `CLAUDE.md`'s Repository → Service → Hook → Component rule), so the practical boundary is:

- **Platform Context repositories** (`profileRepository`, `projectMemberRepository`, future `authRepository`) are the *only* place `supabase.auth` and the `profiles`/`users` tables are touched. These will need a real rewrite when a Go backend + custom auth arrives (different session model entirely).
- **Testing Context repositories** (`testCaseRepository`, `testPlanRepository`, `testRunRepository`, `issueRepository`, …) should depend only on: (a) a `projectId` passed in explicitly, (b) a generic authenticated-fetch client. They must never call `supabase.auth.getUser()` directly — if a caller ID is needed (e.g. `testerId`), it must be passed down from the Service layer, which gets it from `useAuthContext()`. Audit for violations of this during the migration (step 3 above is a natural checkpoint).
- Concretely: once a Go backend exists, only `config/supabaseClient.ts` and the Platform repositories get replaced with REST/gRPC clients; every Testing Context repository's *interface* stays identical, only its implementation swaps.

No REST API design is proposed yet — premature until the Go backend work resumes, per your framing ("kesampingkan backend golang").

---

## 9. MVP Scope After Redesign

**In scope:**
- Self-serve signup, no admin approval gate
- Username + minimal public lookup page (`/@username`: display name/avatar/bio only —
  no project or suite showcase), editable from Settings
- Project `visibility` (private/unlisted/public) + `owner_id`
- Project invite → accept/decline flow, replacing direct-add
- Test Suite Template ownership (`owner_id`) + `visibility`, still clone-only into projects
- Schema-ready `owner_type` on projects (no org tables, no org UI)

**Explicitly out of scope (deferred, not forgotten — and some rejected outright per Constitution):**
- Organizations/Workspaces (tables + UI) — deferred
- Test Suite forking/lineage (`forked_from_id`), versioning — deferred
- Notifications (in-app or email) — **partially built anyway**: a minimal in-app bell + panel shipped 2026-07-28 to support Phase 4's invite/remove lifecycle (see §1 entity table above). Notifications for Testing Domain events (test run completed, issue created, etc.) and email notifications remain deferred.
- Visibility on Issues/Attachments independent of their parent Project — deferred
- Public project/suite showcase, contributions, statistics on profile pages — **rejected**,
  conflicts with Constitution's "not a social network" / "not a portfolio" stance, not merely postponed

---

## Testing Domain (unchanged)

Per your explicit instruction — "Do not redesign the Testing Domain unless there is a strong architectural reason" — no changes are proposed to: `modules`, `tags`, `test_roles`, `test_cases`, `test_case_steps`, `test_plans`, `test_plan_cases`, `test_runs`, `test_results`, `test_result_steps`, `issues`, `attachments`, `entity_code_sequences`. Their RLS policies are updated only insofar as they depend on `has_project_access()`, whose *signature and call sites* don't change — only its internal definition does (§6).
