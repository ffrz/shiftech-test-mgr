---
title: Issues
description: Logging and tracking bugs found during test execution, tied directly to failed Test Results.
---

An **Issue** is a bug report tied to a specific failed Test Result — so
every issue always carries full context: which Test Case, which Test Run,
and when it failed.

## Creating an issue

From a `fail` Test Result, log an Issue with:

- **Title** and **Description**
- **Actual Result** vs **Expected Result**
- **Priority** — `low`, `medium`, `high`, or `critical`
- **Status** — tracked through its own lifecycle as it's triaged and fixed
- **Assigned To** — a project member responsible for resolving it

## One result, multiple issues

A single failed Test Result can have more than one Issue logged against it
— for example, if a tester discovers two unrelated problems while
investigating one failure. Issues are never required to map one-to-one with
Test Results.

## Browsing issues

Issues can be browsed project-wide (not just from the Test Result they
originated from), so you can track everything currently open regardless of
which Test Run first surfaced it.

Next: [Team & Roles](/docs/guide/team-roles/).
