---
title: Core Entities
description: Field-level reference for every entity in Testify's data model.
---

Field names are shown in the app's domain (camelCase) form. The underlying
Postgres tables use snake_case column names.

| Entity | Description |
|---|---|
| `Project` | Top-level container. Status: `active`, `inactive`, or `archived`. |
| `Module` | Grouping, one per project — every Test Case belongs to exactly one Module. |
| `Tag` | Free-form label, per project, many-to-many with Test Cases. |
| `TestCase` | Template: title, objective, precondition, steps, expectedResult, priority (`low`\|`medium`\|`high`\|`critical`), status (`active`\|`archived`), stepType (`simple`\|`detailed`), notes. Never stores a result. |
| `TestPlan` | Scope of Test Cases relevant to a release/cycle. |
| `TestPlanCase` | Junction table — which Test Cases are in which Test Plan, plus sequence order. No result columns. |
| `TestRun` | One execution session. Status: `in_progress` or `completed` (always set manually). May reference a Test Plan, or be an unplanned/custom run built directly from Test Cases. |
| `TestResult` | One row per Test Case tested within a Test Run. Status: `pass`, `fail`, `skip`, `blocked`, or `not_run`. Also: testerId, executedAt, notes. |
| `Issue` | Zero or more per failed Test Result. Fields: title, description, actualResult, expectedResult, priority (`low`\|`medium`\|`high`\|`critical`), status, assignedTo. |
| `ProjectMember` | Links a User to a Project with a role: `manager`, `supervisor`, `tester`, or `member`. Invitation status: `invited`, `accepted`, or `declined`. |
| `User` | Private identity — 1:1 with Supabase `auth.users`. Fields: email, role (`user`\|`admin`, a platform-ops flag — not a project access gate). |
| `Profile` | Public identity — 1:1 with User. Fields: username, displayName, avatarUrl, bio. All user-facing displays resolve through Profile, never User. |

## Rules that shape the schema

- `TestCase` and `TestPlanCase` never carry result columns — results always
  live on `TestResult`, scoped to a specific `TestRun`.
- Re-testing a `TestPlan` always creates a new `TestRun`; previous runs and
  their results are immutable history.
- A `TestRun`'s progress is always derived live from its `TestResult` rows —
  never stored as a column.
- `Issue` is 1-to-many against `TestResult` (a single failed result can have
  multiple issues logged against it).
- A tester must be a registered user (resolved via `Profile`), never a
  free-text name.
