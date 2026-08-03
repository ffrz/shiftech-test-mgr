# Testify Product Constitution

Governing product doc. When any architecture or roadmap decision conflicts with this
file, this file wins — update the plan, not the constitution, unless the user
explicitly amends it here.

## Vision

Testify is a lightweight and modern test management platform for developers and
small-to-medium software teams.

Our mission is to make structured software testing simple, approachable, and
enjoyable without the complexity of enterprise QA tools.

---

## Target Users

We build Testify for:

* Solo developers
* Freelancers
* Software houses
* Small startups
* Internal development teams
* QA beginners
* Growing engineering teams

We do NOT optimize primarily for large enterprises.

---

## Core Philosophy

Every feature must answer this question:

> Does this help a small development team perform software testing more effectively?

If the answer is "No", the feature does not belong in Testify.

---

## Core Features

Testify focuses only on the software testing lifecycle.

Core domains are:

* User
* Project
* Team Members
* Test Cases
* Test Plans
* Test Runs
* Test Results
* Issues
* Attachments
* Tags
* Test Suite Templates

Nothing outside these domains should be considered part of the MVP.

---

## What Testify Is NOT

Testify is NOT:

* Project Management
* Task Management
* Agile Board
* Scrum Tool
* Documentation Platform
* Wiki
* Knowledge Base
* CRM
* ERP
* Source Code Hosting
* Git Repository
* CI/CD Platform
* Team Chat
* Video Meeting Tool
* Bug Bounty Platform
* Social Network

These problems are already solved by other excellent products.

Testify integrates with them instead of replacing them.

---

## Simplicity First

Every screen should remain understandable by a new user within minutes.

If a feature significantly increases learning complexity, it should be rejected or
redesigned.

Simple is preferred over powerful.

---

## Community

Users can:

* Register freely
* Create personal projects
* Invite collaborators
* Share reusable Test Suite templates

Community features exist only to improve software testing.

They are not intended to create a social media platform.

---

## Automation

Automation is NOT part of the MVP.

Future automation support may include:

* Playwright
* Cypress
* Selenium
* API Testing
* CI/CD Integration

Automation should be implemented as optional extensions or premium features.

The manual testing experience must always remain first-class.

---

## AI

AI should assist testing, not replace testers.

Examples:

* Generate test cases
* Improve descriptions
* Suggest edge cases
* Summarize execution results

AI must never become the primary workflow.

---

## Technology Independence

The business domain must remain independent from any specific backend technology.

Supabase is used for rapid development.

Future migration to Go backend should require minimal changes to the business model.

No business rule should depend directly on Supabase.

---

## MVP Success Criteria

A successful MVP allows a new user to:

1. Register an account.
2. Create a project.
3. Invite team members.
4. Write test cases.
5. Organize them into a test plan.
6. Execute testing.
7. Record results.
8. Create issues.
9. Finish a testing cycle in less than one hour.

If users can successfully complete this workflow, the MVP is successful.

Everything else is secondary.

---

## Feature Acceptance Rule

Before implementing any feature, ask:

1. Does it improve software testing?
2. Does it keep the product simple?
3. Will most small teams benefit from it?
4. Can it be explained in one minute?
5. Is it more valuable than improving the existing workflow?

If more than two answers are "No", reject the feature.

---

## Product Motto

Simple QA &amp; Test Management Platform. Open source. Cloud or self-hosted. Built for modern testing.
