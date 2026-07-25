---
title: Test Runs & Results
description: Executing a Test Run, recording Test Results, and how progress and completion work.
---

A **Test Run** is one execution session — e.g. "Regression Test 2026-07-25".
Every time you re-test a Test Plan, you start a **new** Test Run; previous
runs and their results are never overwritten.

## Starting a run

A Test Run is usually started from a Test Plan (inheriting its scope and
sequence), but you can also start an **unplanned/custom run** directly from
a selection of Test Cases without going through a Test Plan first — useful
for quick ad-hoc verification.

## Recording results

Each Test Case in the run gets a **Test Result** with one of these
statuses:

- `not_run` — the default, before anyone has tested it in this run
- `pass`
- `fail`
- `skip`
- `blocked`

A Test Result also records who tested it, when, and any notes. For
`detailed` Test Cases (see [Test Cases](/docs/guide/test-cases/)), each
individual step gets its own outcome within the result.

## Progress vs. completion

These are two different things, deliberately:

- **Progress** (how many results are pass/fail/skip/blocked/not_run) is
  always computed live from the Test Results — it's never a stored,
  manually-updated number, so it can never go stale.
- **Completion** (`in_progress` → `completed`) is always a manual action —
  someone explicitly marks the run as completed when testing is done, even
  if not every Test Case reached a final result.

## Logging bugs

Any `fail` result can have one or more [Issues](/docs/guide/issues/) logged
against it directly from the Test Result.

Next: [Issues](/docs/guide/issues/).
