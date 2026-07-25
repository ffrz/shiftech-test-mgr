---
title: Team & Roles
description: The difference between your global account role and your per-project role in Testify.
---

Testify has two separate, independent role systems — don't confuse them.

## Global account role

Your account has a `role` of either `user` or `admin`. This is a
**platform-operations flag only** — it does not grant access to any
project's data by itself. The `admin` role is used for platform-level
screens like User Management, and it's granted manually (not something you
can request in-app).

## Project role

Access to a specific project's Test Cases, Test Plans, Test Runs, and Issues
is controlled entirely by that project's **members list**. Each member of a
project has one of these roles:

| Role | Description |
|---|---|
| `manager` | Full control over the project, including settings and membership |
| `supervisor` | Oversees execution and reviews results |
| `tester` | Executes Test Runs and records results |
| `member` | General collaborator |

A user can be a `manager` on one project and a `tester` on another — project
roles are entirely independent per project, and unrelated to whether that
user is a global `admin`.

## Your public profile

Whenever you're shown as a tester, assignee, or project member, Testify
displays your **public profile** (username, display name, avatar) — never
your email address, which stays private to your account.

Back to [Introduction](/docs/guide/introduction/), or continue to the
[Data Model Overview](/docs/data-model/overview/).
