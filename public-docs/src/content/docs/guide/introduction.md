---
title: Introduction
description: What Testify is, who it's for, and the core concepts behind manual test management with a full execution history.
---

Testify is a lightweight test management tool for QA teams who track **Test
Plans**, **Test Cases**, and **Test Runs** manually — without resorting to
spreadsheets. It's built around one core idea: **your test template and your
test execution history are two different things, and they should never be
confused with each other.**

## Who it's for

QA teams, small-to-mid engineering teams, and anyone running manual
(non-automated) test cycles who wants:

- A reusable library of Test Cases per project
- The ability to scope a subset of Test Cases into a Test Plan for a
  specific release or cycle
- A full history of every time a Test Plan was executed, without losing
  results from previous runs
- Simple, structured bug tracking tied directly to failed test results

## Core concepts

Testify separates the **template** (what should be tested) from the
**execution history** (what actually happened when it was tested):

```
Project
  └─ Module           (grouping — every Test Case belongs to one Module)
  └─ Tag              (free-form labels, many-to-many with Test Cases)
  └─ Test Case        (the template: title, objective, precondition, steps,
  │                     expected result — never stores a result)
  └─ Test Plan        (a scoped set of Test Cases for a release/cycle)
       └─ Test Run    (one execution session, e.g. "Regression Test 2026-07-25")
            └─ Test Result   (one row per Test Case tested in that run:
                               Pass / Fail / Skip / Blocked)
                 └─ Issue    (0 or more bugs logged against a failed result)
```

A few rules that keep this model honest:

- **Test Cases never store a result.** Pass/fail/skip/blocked always lives on
  a Test Result, scoped to one specific Test Run.
- **Re-running a Test Plan creates a brand new Test Run** — it never
  overwrites a previous run's results. Your history is always intact.
- **A Test Run's progress is always computed live** from its Test Results —
  it's never a stale, manually-updated number.
- **Issues are always tied to a failed Test Result** — bug reports have full
  context on which test, which run, and which build surfaced them.

Ready to try it? Continue to [Signing In](/docs/guide/signing-in/).
