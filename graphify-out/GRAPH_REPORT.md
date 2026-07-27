# Graph Report - .  (2026-07-27)

## Corpus Check
- 339 files · ~155,363 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1873 nodes · 4524 edges · 123 communities (91 shown, 32 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 540 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Test Run Repository (MySQL+Postgres)
- Frontend Repository/Mapper Layer
- Backend App Bootstrap & Config
- Domain Model & Product Rules
- Test Case Backend (Domain+Service+Repo)
- Frontend App Layout & Theme
- Frontend Package Dependencies
- Frontend Issue Management UI
- Frontend Auth & User Settings
- Frontend Test Case UI
- Frontend Routes & Pages
- Frontend Test Run/Plan Detail UI
- Backend Profile Repository
- Backend Issue HTTP Layer
- Backend Test Plan HTTP Layer
- Backend Issue Domain & Service
- Backend Test Case HTTP Layer
- Backend Project HTTP Layer
- Backend Test Run Service
- Frontend Project Management UI
- Backend Test Plan Repository (MySQL)
- Frontend Test Suite UI
- Frontend TS App Config
- Architecture & Product Docs
- Backend Issue Repository (MySQL)
- Backend Test Run HTTP Layer
- Frontend Test Plan UI
- Backend Test Plan Repository (Postgres)
- Backend Issue Repository (Postgres)
- Frontend Test Run Dialogs
- AGENTS.md Conventions
- Backend App Error Types
- Backend Test Plan Service
- Frontend TS Node Config
- Public Docs (Astro/Starlight) Package
- Backend Module Repository (Postgres)
- Backend Google OAuth Service
- Backend Test Case Repository (MySQL)
- Backend Test Run DTO
- Backend Module HTTP DTO
- Backend Tag HTTP DTO
- Backend Test Role HTTP DTO
- Backend Project Repository (MySQL)
- Backend Project Repository (Postgres)
- Backend Project Service
- Backend Attachment HTTP DTO
- Backend Module Repository (MySQL)
- Frontend CSV Import
- Backend Project Membership & Auth Policy
- Backend RBAC Middleware
- Backend JWT & Auth Service
- Backend Test Role Repository (MySQL)
- Backend Module Service
- Backend Auth HTTP Handler
- Backend Attachment Repository (MySQL)
- Backend Tag Repository (MySQL)
- Backend Attachment Repository (Postgres)
- Backend Tag Repository (Postgres)
- Platform Evolution V2 Roadmap
- Backend Attachment Service
- Backend Refresh Token Repository (MySQL)
- Backend Refresh Token Repository (Postgres)
- Backend Tag Service
- Backend Test Role Service
- PRD Feature Concepts
- Task Breakdown Docs (Epics)
- Architecture V2 Migration Docs
- Backend Auth HTTP DTO
- Backend Auth Middleware
- Backend HTTP Response Helpers
- Frontend Lint Config
- Architecture & Design Review Docs
- PrimeReact UI Convention
- Backend Issue DB Model (MySQL)
- Backend Test Case DB Model (MySQL)
- Backend Test Run DB Model (MySQL)
- Backend User/Profile DB Model (MySQL)
- Backend Issue DB Model (Postgres)
- Backend Test Case DB Model (Postgres)
- Backend Test Run DB Model (Postgres)
- Backend User/Profile DB Model (Postgres)
- Public Docs TS Config
- CSV Import & Test Suite Rationale
- Backend Test Plan DB Model (MySQL)
- Backend Test Plan DB Model (Postgres)
- Backend Test Case Snapshot Model (MySQL)
- Backend Test Case Snapshot Model (Postgres)
- Backend Auth Repository Ports
- Backend Attachment DB Model (MySQL)
- Backend Module DB Model (MySQL)
- Backend Project DB Model (MySQL)
- Backend Tag DB Model (MySQL)
- Backend Test Role DB Model (MySQL)
- Backend Project Member Repository (MySQL)
- Backend Attachment DB Model (Postgres)
- Backend Module DB Model (Postgres)
- Backend Project DB Model (Postgres)
- Backend Tag DB Model (Postgres)
- Backend Test Role DB Model (Postgres)
- Backend Project Member Repository (Postgres)
- Backend Panic Recovery Middleware
- Backend Attachment Domain
- Backend Module Domain
- Backend Tag Domain
- Backend Test Role Domain
- Backend Logger
- Deployment Script (VPS)
- Frontend TS Base Config
- Backend Attachment Service Port
- Backend Issue Service Port
- Backend Module Service Port
- Backend Project Service Port
- Backend Tag Service Port
- Backend Test Plan Service Port
- Backend Test Role Service Port
- Features Checklist (Test Plans/Runs)
- Favicon Assets
- Public Docs AGENTS/CLAUDE Boilerplate
- Docs Site Robots/Testify
- Public Docs Content Collections
- Backend Go Module

## God Nodes (most connected - your core abstractions)
1. `Internal()` - 162 edges
2. `react` - 50 edges
3. `OK()` - 41 edges
4. `Validation()` - 35 edges
5. `BindAndValidate()` - 35 edges
6. `NotFound()` - 33 edges
7. `Conflict()` - 32 edges
8. `useAuthContext()` - 31 edges
9. `main()` - 28 edges
10. `useScreenSize()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Frontend icons.svg sprite sheet (bluesky, discord, documentation, github, social, x icons)` --conceptually_related_to--> `Testify Documentation landing page (index.mdx)`  [AMBIGUOUS]
  frontend/public/icons.svg → public-docs/src/content/docs/index.mdx
- `System Architecture - Client-side SPA` --semantically_similar_to--> `Why No Controller/API Layer`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Domain Model - Test Management Workflow` --conceptually_related_to--> `Test Management Workflow design rationale`  [INFERRED]
  AGENTS.md → docs/ARCHITECTURE.md
- `UI Architecture - PrimeReact` --semantically_similar_to--> `PrimeReact UI Library Usage`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Infrastructure Feature Checklist` --conceptually_related_to--> `backend/ Go Backend PENDING Status`  [INFERRED]
  FEATURES.md → backend/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Platform Evolution V2 governance chain (Constitution → Architecture → Roadmap)** — constitution_testify, archv2_platform_evolution, roadmapv2_testify, todo_sprint_board [EXTRACTED 1.00]
- **Test Management Workflow documented across PRD/Architecture/Design-Review/AGENTS** — docs_prd_test_management_concept, arch_test_management_workflow_rationale, design_review_full_history_decision, agents_domain_model_test_management [INFERRED 0.90]
- **E12 Epic spanning Tasks, Agent Prompt, PRD and Architecture** — docs_tasks_e12_issue_tracking_v2, docs_prompts_e12_agent_prompt, docs_prd_issue_tracking_v2, arch_test_suite_library_e17 [INFERRED 0.75]
- **Test execution history flow: Plan -> Run -> Result -> Issue** — entity_testplan, entity_testrun, entity_testresult, entity_issue [EXTRACTED 0.90]
- **Identity and access model: User/Profile split with per-project roles** — entity_user, entity_profile, entity_projectmember, role_manager, role_supervisor, role_tester, role_member [EXTRACTED 0.85]
- **Starlight docs site branding assets** — public_docs_public_favicon_svg, public_docs_src_assets_houston, astro_starlight_framework [INFERRED 0.75]

## Communities (123 total, 32 thin omitted)

### Community 0 - "Test Run Repository (MySQL+Postgres)"
Cohesion: 0.05
Nodes (50): Time, Context, DB, NewTestCaseSnapshotRepository(), NewTestPlanCaseReader(), fromDomainTestRun(), Context, DB (+42 more)

### Community 1 - "Frontend Repository/Mapper Layer"
Cohesion: 0.06
Nodes (53): supabase, mapAttachmentRow(), mapGithubLinks(), mapIssueRow(), mapModuleRow(), mapProfileRow(), mapProjectMemberInvitationRow(), mapProjectMemberRow() (+45 more)

### Community 2 - "Backend App Bootstrap & Config"
Cohesion: 0.07
Nodes (49): getLogLevel(), DB, ProfileRepository, ProjectMemberRepository, RefreshTokenRepository, Repository, TestCaseRepository, main() (+41 more)

### Community 3 - "Domain Model & Product Rules"
Cohesion: 0.07
Nodes (52): Astro Starlight Card/CardGrid components, Astro Starlight documentation framework, Two separate role systems: global account role vs per-project role, Google OAuth-only sign-in, Testify has no custom REST API, Postgres Row-Level Security (RLS), Test Case sequencing/ordering within a Test Plan, Step mode: detailed (+44 more)

### Community 4 - "Test Case Backend (Domain+Service+Repo)"
Cohesion: 0.09
Nodes (33): Time, fromDomainTestCase(), Context, DB, Query, TestCase, TestCaseStep, NewTestCaseRepository() (+25 more)

### Community 5 - "Frontend App Layout & Theme"
Cohesion: 0.07
Nodes (39): AppLayout(), AppLayoutInner(), AppMenu(), AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar(), AppSidebarMask() (+31 more)

### Community 6 - "Frontend Package Dependencies"
Cohesion: 0.04
Nodes (47): dependencies, @hookform/resolvers, primeflex, primeicons, primereact, react, react-dom, react-hook-form (+39 more)

### Community 7 - "Frontend Issue Management UI"
Cohesion: 0.09
Nodes (34): IssueEditor(), IssueEditorProps, IssueFormData, PRIORITY_OPTIONS, TYPE_OPTIONS, SearchInput(), SearchInputProps, ISSUE_PRIORITY_LABEL (+26 more)

### Community 8 - "Frontend Auth & User Settings"
Cohesion: 0.10
Nodes (26): App(), Breadcrumb(), BreadcrumbItem, BreadcrumbProps, PageHeader(), PageHeaderProps, UsernamePicker(), UsernamePickerProps (+18 more)

### Community 9 - "Frontend Test Case UI"
Cohesion: 0.11
Nodes (27): PROJECT_MEMBER_ROLE_SEVERITY, TagSeverity, TEST_CASE_PRIORITY_LABEL, TEST_CASE_PRIORITY_SEVERITY, TEST_CASE_STATUS_LABEL, TEST_CASE_STATUS_SEVERITY, DetailedStep, PRIORITY_OPTIONS (+19 more)

### Community 10 - "Frontend Routes & Pages"
Cohesion: 0.13
Nodes (29): AdminRoute(), ProtectedRoute(), formatDateTime(), useAuthContext(), useDashboard(), useIssuesByTestRun(), useProjectInvitations(), useProjectRole() (+21 more)

### Community 11 - "Frontend Test Run/Plan Detail UI"
Cohesion: 0.12
Nodes (28): BulkActionsBar(), BulkActionsBarProps, TEST_RESULT_STATUS_LABEL, TEST_RESULT_STATUS_SEVERITY, TEST_RUN_STATUS_LABEL, TEST_RUN_STATUS_SEVERITY, queryKeys, useTestPlanDetail() (+20 more)

### Community 12 - "Backend Profile Repository"
Cohesion: 0.13
Nodes (18): Time, fromDomainProfile(), Context, DB, Profile, NewProfileRepository(), toDomainProfile(), fromDomainProfile() (+10 more)

### Community 13 - "Backend Issue HTTP Layer"
Cohesion: 0.12
Nodes (19): FromIssue(), FromIssues(), GithubLink, Issue, Time, toDomainGithubLinks(), Context, Service (+11 more)

### Community 14 - "Backend Test Plan HTTP Layer"
Cohesion: 0.12
Nodes (19): FromTestPlan(), FromTestPlanCase(), FromTestPlanCases(), FromTestPlans(), TestPlan, Time, Context, Service (+11 more)

### Community 15 - "Backend Issue Domain & Service"
Cohesion: 0.13
Nodes (18): Time, Context, GithubLink, Issue, Priority, Repository, Status, NewService() (+10 more)

### Community 16 - "Backend Test Case HTTP Layer"
Cohesion: 0.13
Nodes (20): FromTestCase(), FromTestCases(), FromTestCaseWithDetails(), TestCase, Time, Context, Service, NewTestCaseHandler() (+12 more)

### Community 17 - "Backend Project HTTP Layer"
Cohesion: 0.13
Nodes (18): Time, FromProject(), FromProjects(), Project, Time, Context, Service, NewProjectHandler() (+10 more)

### Community 18 - "Backend Test Run Service"
Cohesion: 0.19
Nodes (11): Validation(), computeSummary(), Context, Repository, Summary, TestCaseRepository, TestRun, NewService() (+3 more)

### Community 19 - "Frontend Project Management UI"
Cohesion: 0.15
Nodes (21): PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, PROJECT_VISIBILITY_LABEL, PROJECT_VISIBILITY_SEVERITY, CreateProjectDialog(), CreateProjectDialogProps, VISIBILITY_OPTIONS, ContinueWorkingItem (+13 more)

### Community 20 - "Backend Test Plan Repository (MySQL)"
Cohesion: 0.18
Nodes (13): Time, fromDomainTestPlan(), Context, DB, TestPlan, TestPlanCase, NewTestPlanRepository(), toDomainTestPlan() (+5 more)

### Community 21 - "Frontend Test Suite UI"
Cohesion: 0.14
Nodes (18): TestSuiteDialog(), TestSuiteDialogMode, TestSuiteDialogProps, VISIBILITY_OPTIONS, RowActionsMenu(), RowActionsMenuProps, TEST_SUITE_VISIBILITY_LABEL, TEST_SUITE_VISIBILITY_SEVERITY (+10 more)

### Community 22 - "Frontend TS App Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 23 - "Architecture & Product Docs"
Cohesion: 0.12
Nodes (23): Architectural Risks & Notes, API Boundary Proposal for future Go backend, Testify Platform Evolution - Architecture Redesign, Public Profile Rescoped to Functional Identity Only, backend docker-compose.yml (mysql+postgres), MySQL mysql_native_password auth plugin choice, backend/ Go Backend PENDING Status, Repository Layer Swappable for Future Backend (+15 more)

### Community 24 - "Backend Issue Repository (MySQL)"
Cohesion: 0.29
Nodes (10): Internal(), fromDomainIssue(), Context, DB, Issue, Status, NewIssueRepository(), toDomainIssue() (+2 more)

### Community 25 - "Backend Test Run HTTP Layer"
Cohesion: 0.21
Nodes (9): FromTestRun(), FromTestRuns(), TestRun, Context, Service, NewTestRunHandler(), OK(), TestRunResponse (+1 more)

### Community 26 - "Frontend Test Plan UI"
Cohesion: 0.17
Nodes (16): dataTablePaginatorProps, dataTablePaginatorTemplate, formatDate(), TEST_PLAN_STATUS_LABEL, TEST_PLAN_STATUS_SEVERITY, useTestPlans(), TEST_PLAN_STATUS_OPTIONS, TestPlanTab() (+8 more)

### Community 27 - "Backend Test Plan Repository (Postgres)"
Cohesion: 0.21
Nodes (10): isDuplicateKeyErr(), fromDomainTestPlan(), Context, DB, TestPlan, TestPlanCase, NewTestPlanRepository(), toDomainTestPlan() (+2 more)

### Community 28 - "Backend Issue Repository (Postgres)"
Cohesion: 0.26
Nodes (9): fromDomainIssue(), Context, DB, Issue, Status, NewIssueRepository(), toDomainIssue(), toDomainIssues() (+1 more)

### Community 29 - "Frontend Test Run Dialogs"
Cohesion: 0.12
Nodes (15): useTabQueryParam(), CreateTestRunDialog(), CreateTestRunDialogProps, DuplicateTestPlanDialog(), DuplicateTestPlanDialogProps, QuickAddDialog(), QuickAddDialogProps, TestCaseDialog() (+7 more)

### Community 30 - "AGENTS.md Conventions"
Cohesion: 0.14
Nodes (20): Clean Architecture Layering (Repository→Service→Hook→Component), Domain Model - Test Management Workflow, Google OAuth Setup Steps, Module Creation Order convention, PageHeader Convention (Judul Halaman), TestManager (shiftech-test-mgr), Layered Architecture Flow (Page→Hook→Service→Repository→Supabase), React Query + Supabase Realtime Data Freshness (E14) (+12 more)

### Community 31 - "Backend App Error Types"
Cohesion: 0.21
Nodes (11): Error, Kind, As(), Conflict(), NotFound(), Context, DB, TestRole (+3 more)

### Community 32 - "Backend Test Plan Service"
Cohesion: 0.22
Nodes (8): Context, Repository, Status, TestPlan, NewService(), CreateInput, Service, UpdateInput

### Community 33 - "Frontend TS Node Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 34 - "Public Docs (Astro/Starlight) Package"
Cohesion: 0.11
Nodes (18): astro, @astrojs/sitemap, @astrojs/starlight, dependencies, astro, @astrojs/sitemap, @astrojs/starlight, sharp (+10 more)

### Community 35 - "Backend Module Repository (Postgres)"
Cohesion: 0.20
Nodes (11): Context, DB, Next(), fromDomainModule(), Context, DB, Module, NewModuleRepository() (+3 more)

### Community 36 - "Backend Google OAuth Service"
Cohesion: 0.23
Nodes (12): GoogleConfig, googleUserInfo, Service, TokenPair, Unauthorized(), Context, Duration, Profile (+4 more)

### Community 37 - "Backend Test Case Repository (MySQL)"
Cohesion: 0.27
Nodes (10): fromDomainTestCase(), Context, DB, Query, TestCase, TestCaseStep, NewTestCaseRepository(), toDomainTestCase() (+2 more)

### Community 38 - "Backend Test Run DTO"
Cohesion: 0.18
Nodes (17): FromTestResult(), FromTestResults(), FromTestResultStep(), FromTestRunSummary(), FromTestRunWithResults(), Summary, Time, CompleteTestRunRequest (+9 more)

### Community 39 - "Backend Module HTTP DTO"
Cohesion: 0.20
Nodes (11): FromModule(), FromModules(), Module, Time, Context, Service, NewModuleHandler(), CreateModuleRequest (+3 more)

### Community 40 - "Backend Tag HTTP DTO"
Cohesion: 0.20
Nodes (11): FromTag(), FromTags(), Tag, Time, Context, Service, NewTagHandler(), CreateTagRequest (+3 more)

### Community 41 - "Backend Test Role HTTP DTO"
Cohesion: 0.20
Nodes (11): FromTestRole(), FromTestRoles(), TestRole, Time, Context, Service, NewTestRoleHandler(), CreateTestRoleRequest (+3 more)

### Community 42 - "Backend Project Repository (MySQL)"
Cohesion: 0.30
Nodes (9): fromDomainProject(), Context, DB, Project, Query, Status, NewProjectRepository(), toDomainProject() (+1 more)

### Community 43 - "Backend Project Repository (Postgres)"
Cohesion: 0.30
Nodes (9): fromDomainProject(), Context, DB, Project, Query, Status, NewProjectRepository(), toDomainProject() (+1 more)

### Community 44 - "Backend Project Service"
Cohesion: 0.23
Nodes (9): Context, Project, Query, Repository, Status, NewService(), CreateInput, Service (+1 more)

### Community 45 - "Backend Attachment HTTP DTO"
Cohesion: 0.21
Nodes (11): FromAttachment(), FromAttachments(), Attachment, Time, Context, Service, NewAttachmentHandler(), AttachmentResponse (+3 more)

### Community 46 - "Backend Module Repository (MySQL)"
Cohesion: 0.30
Nodes (8): isDuplicateKeyErr(), fromDomainModule(), Context, DB, Module, NewModuleRepository(), toDomainModule(), ModuleRepository

### Community 47 - "Frontend CSV Import"
Cohesion: 0.22
Nodes (11): RFC-4180, ExcelImportPanel(), EXPECTED_HEADERS, InvalidRow, parseCsvText(), ParsedTestCaseRow, parseTestCaseCsv(), PRIORITIES (+3 more)

### Community 48 - "Backend Project Membership & Auth Policy"
Cohesion: 0.27
Nodes (9): Forbidden(), Context, Context, CanDeleteProject(), CanEditProject(), CanManageIssues(), CanManageTests(), Member (+1 more)

### Community 49 - "Backend RBAC Middleware"
Cohesion: 0.40
Nodes (12): MiddlewareFunc, ProjectMemberRepository, RequireProjectAccess(), RequireProjectDelete(), RequireProjectEdit(), RequireProjectManageIssues(), RequireProjectManageTests(), requireProjectRole() (+4 more)

### Community 50 - "Backend JWT & Auth Service"
Cohesion: 0.23
Nodes (8): Duration, Profile, HashRefreshToken(), NewRefreshToken(), NewService(), Claims, Service, RegisteredClaims

### Community 51 - "Backend Test Role Repository (MySQL)"
Cohesion: 0.38
Nodes (6): Context, DB, TestRole, NewTestRoleRepository(), toDomainTestRole(), TestRoleRepository

### Community 52 - "Backend Module Service"
Cohesion: 0.30
Nodes (7): Context, Module, Repository, NewService(), CreateInput, Service, UpdateInput

### Community 53 - "Backend Auth HTTP Handler"
Cohesion: 0.27
Nodes (7): BindAndValidate(), Context, Context, ProfileRepository, Service, NewAuthHandler(), AuthHandler

### Community 54 - "Backend Attachment Repository (MySQL)"
Cohesion: 0.36
Nodes (7): fromDomainAttachment(), Attachment, Context, DB, NewAttachmentRepository(), toDomainAttachment(), AttachmentRepository

### Community 55 - "Backend Tag Repository (MySQL)"
Cohesion: 0.38
Nodes (6): Context, DB, Tag, NewTagRepository(), toDomainTag(), TagRepository

### Community 56 - "Backend Attachment Repository (Postgres)"
Cohesion: 0.36
Nodes (7): fromDomainAttachment(), Attachment, Context, DB, NewAttachmentRepository(), toDomainAttachment(), AttachmentRepository

### Community 57 - "Backend Tag Repository (Postgres)"
Cohesion: 0.38
Nodes (6): Context, DB, Tag, NewTagRepository(), toDomainTag(), TagRepository

### Community 58 - "Platform Evolution V2 Roadmap"
Cohesion: 0.29
Nodes (10): MVP Scope After Redesign, MVP Success Criteria (9-step golden path), Golden Path 9-step flow, Phase 1 - Identity Split (users+profiles), Phase 2 - Drop Approval Gate, Phase 3 - Project Ownership + Visibility, Phase 4 - Membership Invite/Accept Flow, Phase 5 - Test Suite Template Ownership + Visibility (+2 more)

### Community 59 - "Backend Attachment Service"
Cohesion: 0.33
Nodes (6): CreateInput, Service, Attachment, Context, Repository, NewService()

### Community 60 - "Backend Refresh Token Repository (MySQL)"
Cohesion: 0.33
Nodes (5): Context, DB, RefreshToken, NewRefreshTokenRepository(), RefreshTokenRepository

### Community 61 - "Backend Refresh Token Repository (Postgres)"
Cohesion: 0.33
Nodes (5): Context, DB, RefreshToken, NewRefreshTokenRepository(), RefreshTokenRepository

### Community 62 - "Backend Tag Service"
Cohesion: 0.36
Nodes (5): Context, Repository, Tag, NewService(), Service

### Community 63 - "Backend Test Role Service"
Cohesion: 0.36
Nodes (5): Context, Repository, TestRole, NewService(), Service

### Community 64 - "PRD Feature Concepts"
Cohesion: 0.20
Nodes (10): Attachment via Storage Adapter, Issue & Feature Tracking (N:M to Test Result), Sequence (urutan eksekusi) di Test Plan, Test Case step_type (simple/detailed), Konsep Test Management (Project→Module→TestCase→TestPlan→TestRun→TestResult→Issue), Test Run Unplanned/Custom, E12 - Issue & Feature Tracking v2, Structured Steps, Attachment Adapter, E16 - Custom/Unplanned Test Run (+2 more)

### Community 65 - "Task Breakdown Docs (Epics)"
Cohesion: 0.28
Nodes (9): Auth & RBAC Detail (project-scoped RLS), RBAC per-project (project_members roles), E01 - Fondasi Arsitektur, E09 - Restrukturisasi Monorepo, E13 - Test Run Detail Page + Sequence, E14 - React Query + Realtime Sync, E15 - RBAC Per-Project, TASKS - TestManager work breakdown (+1 more)

### Community 66 - "Architecture V2 Migration Docs"
Cohesion: 0.33
Nodes (9): Updated Bounded Contexts (Platform vs Testing), Entity-by-entity Disposition table, Migration Strategy (8 ordered steps), Organization-readiness without building organizations, project_members Invite/Accept Lifecycle, Project Ownership + Visibility, Test Suite Ownership + Visibility, Testing Domain (unchanged) (+1 more)

### Community 67 - "Backend Auth HTTP DTO"
Cohesion: 0.28
Nodes (7): FromProfile(), Profile, GoogleCallbackRequest, LogoutRequest, ProfileResponse, RefreshRequest, TokenPairResponse

### Community 68 - "Backend Auth Middleware"
Cohesion: 0.33
Nodes (8): extractBearerToken(), Context, MiddlewareFunc, Service, RequireAdmin(), RequireApproved(), RequireAuth(), UserIDFromContext()

### Community 69 - "Backend HTTP Response Helpers"
Cohesion: 0.33
Nodes (8): Context, HTTPErrorHandler(), httpMessage(), OKWithMeta(), statusFor(), HTTPError, envelope, errorBody

### Community 70 - "Frontend Lint Config"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 71 - "Architecture & Design Review Docs"
Cohesion: 0.29
Nodes (8): Database Schema (Supabase/Postgres), Entity Code Auto-Generate mechanism (next_entity_code), Test Management Workflow design rationale, Decision: Full history instead of last-result, Design Review - Test Management v2, E08 - Test Management v2, Entity Code Auto-Generate Feature, Projects Feature Module

### Community 72 - "PrimeReact UI Convention"
Cohesion: 0.25
Nodes (7): UI Architecture - PrimeReact, PrimeReact UI Library Usage, Testify Vision, frontend/index.html entry point, Theme mode switch inline script (dark/light PrimeReact theme), Testify Landing Page, Repo Structure (landing/frontend/backend/supabase/docs)

### Community 73 - "Backend Issue DB Model (MySQL)"
Cohesion: 0.29
Nodes (4): Issue, IssueTag, IssueTestResult, Time

### Community 74 - "Backend Test Case DB Model (MySQL)"
Cohesion: 0.29
Nodes (4): TestCase, TestCaseStep, TestCaseTag, Time

### Community 75 - "Backend Test Run DB Model (MySQL)"
Cohesion: 0.32
Nodes (4): TestResult, TestResultStep, TestRun, Time

### Community 76 - "Backend User/Profile DB Model (MySQL)"
Cohesion: 0.32
Nodes (4): Profile, ProjectMember, RefreshToken, Time

### Community 77 - "Backend Issue DB Model (Postgres)"
Cohesion: 0.29
Nodes (4): Issue, IssueTag, IssueTestResult, Time

### Community 78 - "Backend Test Case DB Model (Postgres)"
Cohesion: 0.29
Nodes (4): TestCase, TestCaseStep, TestCaseTag, Time

### Community 79 - "Backend Test Run DB Model (Postgres)"
Cohesion: 0.32
Nodes (4): TestResult, TestResultStep, TestRun, Time

### Community 80 - "Backend User/Profile DB Model (Postgres)"
Cohesion: 0.32
Nodes (4): Profile, ProjectMember, RefreshToken, Time

### Community 81 - "Public Docs TS Config"
Cohesion: 0.25
Nodes (7): exclude, extends, include, **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist

### Community 82 - "CSV Import & Test Suite Rationale"
Cohesion: 0.40
Nodes (6): CSV Import instead of xlsx dependency, Test Suite Library, Import CSV, RBAC Field (E17), E17 - Test Case Template Library, Import CSV, RBAC Field, Modules & Tags Feature, Test Cases Feature, Test Suite Library Feature (E17)

### Community 83 - "Backend Test Plan DB Model (MySQL)"
Cohesion: 0.33
Nodes (3): TestPlan, TestPlanCase, Time

### Community 84 - "Backend Test Plan DB Model (Postgres)"
Cohesion: 0.33
Nodes (3): TestPlan, TestPlanCase, Time

### Community 87 - "Backend Auth Repository Ports"
Cohesion: 0.50
Nodes (3): ProfileRepository, ProjectMemberRepository, RefreshTokenRepository

### Community 93 - "Backend Project Member Repository (MySQL)"
Cohesion: 0.83
Nodes (3): DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 99 - "Backend Project Member Repository (Postgres)"
Cohesion: 0.83
Nodes (3): DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 100 - "Backend Panic Recovery Middleware"
Cohesion: 0.50
Nodes (3): Logger, MiddlewareFunc, Recover()

## Ambiguous Edges - Review These
- `Testify Documentation landing page (index.mdx)` → `Frontend icons.svg sprite sheet (bluesky, discord, documentation, github, social, x icons)`  [AMBIGUOUS]
  frontend/public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **239 isolated node(s):** `github.com/shiftech/testmgr-backend`, `TagLink`, `Summary`, `Repository`, `ProfileRepository` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Testify Documentation landing page (index.mdx)` and `Frontend icons.svg sprite sheet (bluesky, discord, documentation, github, social, x icons)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Internal()` connect `Backend Issue Repository (MySQL)` to `Test Run Repository (MySQL+Postgres)`, `Test Case Backend (Domain+Service+Repo)`, `Backend Profile Repository`, `Backend Test Plan Repository (MySQL)`, `Backend Test Plan Repository (Postgres)`, `Backend Issue Repository (Postgres)`, `Backend App Error Types`, `Backend Module Repository (Postgres)`, `Backend Google OAuth Service`, `Backend Test Case Repository (MySQL)`, `Backend Project Repository (MySQL)`, `Backend Project Repository (Postgres)`, `Backend Module Repository (MySQL)`, `Backend Project Membership & Auth Policy`, `Backend Test Role Repository (MySQL)`, `Backend Attachment Repository (MySQL)`, `Backend Tag Repository (MySQL)`, `Backend Attachment Repository (Postgres)`, `Backend Tag Repository (Postgres)`, `Backend Refresh Token Repository (MySQL)`, `Backend Refresh Token Repository (Postgres)`, `Backend Panic Recovery Middleware`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `Validation()` connect `Backend Test Run Service` to `Backend Test Plan Service`, `Test Case Backend (Domain+Service+Repo)`, `Backend Project Service`, `Backend Attachment HTTP DTO`, `Backend Issue HTTP Layer`, `Backend Test Plan HTTP Layer`, `Backend Test Case HTTP Layer`, `Backend Project HTTP Layer`, `Backend Issue Domain & Service`, `Backend Module Service`, `Backend Auth HTTP Handler`, `Backend Test Run HTTP Layer`, `Backend Attachment Service`, `Backend Test Role Service`, `Backend Tag Service`, `Backend App Error Types`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `Error` connect `Backend App Error Types` to `Backend Project Membership & Auth Policy`, `Backend Issue Repository (MySQL)`, `Backend Test Run Service`, `Backend Google OAuth Service`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 160 inferred relationships involving `Internal()` (e.g. with `.issueTokenPair()` and `toDomainIssues()`) actually correct?**
  _`Internal()` has 160 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `OK()` (e.g. with `.List()` and `.Me()`) actually correct?**
  _`OK()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 33 inferred relationships involving `Validation()` (e.g. with `.Create()` and `BindAndValidate()`) actually correct?**
  _`Validation()` has 33 INFERRED edges - model-reasoned connections that need verification._