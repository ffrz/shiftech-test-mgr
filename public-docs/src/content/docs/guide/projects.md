---
title: Projects
description: Creating projects, inviting members, and the roles that control access within a project.
---

A **Project** is the top-level container in Testify — everything else
(Modules, Tags, Test Cases, Test Plans, Test Runs, Issues) belongs to exactly
one project.

## Creating a project

From the Projects list, create a new project with a name and status
(`active`, `inactive`, or `archived`). You become its first member
automatically.

## Members and roles

Access to a project is controlled by its **members list**, not by your
global account role. Each member has one of four roles:

| Role | Typical use |
|---|---|
| `manager` | Full control over the project, including settings and members |
| `supervisor` | Oversees test execution and reviews results |
| `tester` | Executes Test Runs and records results |
| `member` | General collaborator with read/contribute access |

Invitations go through `invited` → `accepted` / `declined`. A project member
must be a registered Testify user (identified by their public profile) — you
can't assign a Test Run to free-text names.

## Modules and Tags

Two independent ways to organize Test Cases within a project:

- **Module** — every Test Case belongs to exactly one Module (e.g. by
  feature area). Managed per-project from Project Settings.
- **Tag** — free-form labels, many-to-many with Test Cases. Use tags for
  anything that doesn't fit a strict one-per-case hierarchy (e.g. "smoke",
  "regression", "flaky").

Next: [Test Cases](/docs/guide/test-cases/).
