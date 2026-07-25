---
title: Data Model Overview
description: Testify has no custom REST API — this page explains how the app actually talks to its data.
---

:::note
Testify does not have a custom REST API. This page documents its
**conceptual data model**, not an API reference.
:::

Testify is a single-page web app that talks **directly to a
[Supabase](https://supabase.com) (Postgres) project** from the browser,
using Supabase's auto-generated data access layer. There's no custom backend
server sitting in between — access control is enforced at the database level
via Postgres **Row-Level Security (RLS)**, not by application code.

If you're integrating with Testify or just want to understand what's stored
where, think of this page as documentation of the underlying tables and how
they relate, not a list of HTTP endpoints.

## Entity relationships

```
Project
  ├─ Module           (grouping — every Test Case belongs to one Module)
  ├─ Tag              (free-form label, many-to-many with Test Cases)
  ├─ Test Case        (template — never stores a result)
  └─ Test Plan        (scope: which Test Cases matter for a cycle)
       └─ Test Run    (one execution session)
            └─ Test Result   (one row per Test Case tested in that run)
                 └─ Issue    (0 or more bugs per failed Test Result)
```

Identity is modeled as two separate tables:

```
User      — private: email, global role (user | admin)
Profile   — public: username, display name, avatar, bio
```

Every user-facing display (tester name, assignee, project member) always
resolves through **Profile**, never through **User** — email addresses are
never exposed outside a user's own account.

See [Core Entities](/docs/data-model/entities/) for the full field-level
breakdown.
