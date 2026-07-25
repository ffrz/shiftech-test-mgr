---
title: Signing In
description: How to sign in to Testify — Google OAuth only, self-serve signup with no approval gate.
---

Testify uses **Google OAuth only** — there's no email/password login. Sign in
from [testify.apps.shiftech.my.id/app/](/app/) using your Google account.

## Signup is self-serve

The first time you sign in with a Google account, Testify creates your
account automatically with the standard `user` role — there's no pending
approval step and no admin gate. You can start creating projects
immediately.

## Access is per-project, not global

Your account's `role` (`user` or `admin`) is a platform-operations flag — it
does **not** by itself grant access to any project's data. Access to a
specific project's Test Cases, Test Plans, and Test Runs is controlled by
that project's **members list**. A project owner or manager needs to add you
as a member before you can see or work in that project.

The `admin` role is reserved for platform operations (e.g. the User
Management screen) and is granted manually — it's not something you can
request through the app.

## Your profile

Your Google account's email is kept private and is never shown to other
users. What other members see is your **public profile** — a username,
display name, avatar, and optional bio — which you can edit from Settings
after signing in.
