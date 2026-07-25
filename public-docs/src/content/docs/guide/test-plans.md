---
title: Test Plans
description: Scoping Test Cases into a Test Plan for a release or cycle, and ordering execution sequence.
---

A **Test Plan** defines *which* Test Cases are relevant for a particular
release or test cycle — it's a scope, not an execution record.

## Building a Test Plan

Add existing Test Cases from the project's library to the plan. A Test Plan
doesn't duplicate the Test Case content — it references the live Test Case,
so if a Test Case's steps are edited, every Test Plan that includes it sees
the update immediately (previously completed Test Runs still keep their own
historical record, since results are captured on Test Result, not the Test
Case itself).

## Sequencing

Test Cases within a Test Plan can be reordered via drag-and-drop. This
sequence carries over to every Test Run started from the plan, giving
testers a suggested execution order — it's guidance, not a hard gate; a
tester can still record results out of order if that fits their workflow.

## Starting a Test Run

A Test Plan itself is never "run" or "completed" — starting execution always
creates a new [Test Run](/docs/guide/test-runs/) that copies the plan's
current scope and sequence as its starting point. You can start as many Test
Runs from the same Test Plan as you need (e.g. one per build), and each one
keeps its own independent results.

Next: [Test Runs & Results](/docs/guide/test-runs/).
