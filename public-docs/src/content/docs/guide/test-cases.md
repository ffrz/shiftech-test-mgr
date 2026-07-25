---
title: Test Cases
description: Fields, priority levels, and step modes for Test Cases — the reusable templates behind every Test Plan.
---

A **Test Case** is a reusable template describing what to test — it never
stores a result. The same Test Case can be reused across many Test Plans and
executed many times over its lifetime; each execution produces a separate
Test Result on whichever Test Run it was part of.

## Fields

- **Title, Objective, Precondition** — what the test verifies and what state
  the system must be in before running it
- **Steps** and **Expected Result** — see step modes below
- **Module** — exactly one per Test Case
- **Tags** — zero or more, free-form
- **Priority** — `low`, `medium`, `high`, or `critical`
- **Status** — `active` (available for new Test Plans) or `archived`
  (retired, but preserved for historical runs that already reference it)
- **Notes** — free-form additional context

## Step modes

Every Test Case is either `simple` or `detailed`:

- **Simple** — a single free-text steps field plus a single expected result.
  Fast to write, good for straightforward checks.
- **Detailed** — an ordered list of individual steps, each with its own
  expected result. When a `detailed` Test Case is executed, each step gets
  its own pass/fail outcome as part of the Test Result, not just one
  overall verdict.

Choose `detailed` when a test has multiple checkpoints worth tracking
independently (e.g. a multi-step checkout flow); choose `simple` for
single-assertion checks.

Next: [Test Plans](/docs/guide/test-plans/).
