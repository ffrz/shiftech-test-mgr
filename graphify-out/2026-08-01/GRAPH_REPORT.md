# Graph Report - shiftech-test-mgr  (2026-08-01)

## Corpus Check
- 448 files · ~224,053 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2171 nodes · 5487 edges · 166 communities (126 shown, 40 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 541 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eca2b773`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- supabaseClient.ts
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
- ResultStep
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
- MentionTextarea.tsx
- Public Docs AGENTS/CLAUDE Boilerplate
- Docs Site Robots/Testify
- Public Docs Content Collections
- Backend Go Module
- frontend/scripts/generate-icons.mjs
- manifest.json
- dashboardRepository.ts
- NotFound
- RequireAuth
- frontend/package.json
- auditLogRepository.ts
- opencode.json
- graphify.js
- SupabaseStorageAdapter.ts
- primeicons
- primereact
- .Update
- TestCaseSnapshotRepository
- Created
- TestCaseSnapshotRepository
- primereact
- @supabase/supabase-js
- @tanstack/react-query
- ProjectMemberRepository
- test-plans/components/dialogs/DuplicateTestPlanDialog.tsx
- testplan/entity.go
- Recover
- projectDuplicateService.test.ts
- entityAttachmentRepository.ts
- testSuiteService.test.ts
- react-hook-form
- react-markdown
- attachmentService.test.ts
- react

## God Nodes (most connected - your core abstractions)
1. `Internal()` - 162 edges
2. `react` - 70 edges
3. `useAuthContext()` - 67 edges
4. `OK()` - 41 edges
5. `Validation()` - 35 edges
6. `BindAndValidate()` - 35 edges
7. `NotFound()` - 33 edges
8. `Conflict()` - 32 edges
9. `queryKeys` - 30 edges
10. `main()` - 28 edges

## Surprising Connections (you probably didn't know these)
- `System Architecture - Client-side SPA` --semantically_similar_to--> `Why No Controller/API Layer`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Domain Model - Test Management Workflow` --conceptually_related_to--> `Test Management Workflow design rationale`  [INFERRED]
  AGENTS.md → docs/ARCHITECTURE.md
- `UI Architecture - PrimeReact` --semantically_similar_to--> `PrimeReact UI Library Usage`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Infrastructure Feature Checklist` --conceptually_related_to--> `backend/ Go Backend PENDING Status`  [INFERRED]
  FEATURES.md → backend/README.md
- `E09 - Restrukturisasi Monorepo` --conceptually_related_to--> `backend/ Go Backend PENDING Status`  [INFERRED]
  docs/TASKS.md → backend/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Platform Evolution V2 governance chain (Constitution → Architecture → Roadmap)** — constitution_testify, archv2_platform_evolution, roadmapv2_testify, todo_sprint_board [EXTRACTED 1.00]
- **Test Management Workflow documented across PRD/Architecture/Design-Review/AGENTS** — docs_prd_test_management_concept, arch_test_management_workflow_rationale, design_review_full_history_decision, agents_domain_model_test_management [INFERRED 0.90]
- **E12 Epic spanning Tasks, Agent Prompt, PRD and Architecture** — docs_tasks_e12_issue_tracking_v2, docs_prompts_e12_agent_prompt, docs_prd_issue_tracking_v2, arch_test_suite_library_e17 [INFERRED 0.75]
- **Test execution history flow: Plan -> Run -> Result -> Issue** — entity_testplan, entity_testrun, entity_testresult, entity_issue [EXTRACTED 0.90]
- **Identity and access model: User/Profile split with per-project roles** — entity_user, entity_profile, entity_projectmember, role_manager, role_supervisor, role_tester, role_member [EXTRACTED 0.85]
- **Starlight docs site branding assets** — public_docs_public_favicon_svg, public_docs_src_assets_houston, astro_starlight_framework [INFERRED 0.75]

## Communities (166 total, 40 thin omitted)

### Community 0 - "Test Run Repository (MySQL+Postgres)"
Cohesion: 0.12
Nodes (23): Time, fromDomainTestRun(), Context, DB, Status, TestResult, TestResultStep, TestRun (+15 more)

### Community 1 - "Frontend Repository/Mapper Layer"
Cohesion: 0.10
Nodes (31): RelativeTime(), RelativeTimeProps, formatDate(), formatDateTime(), formatRelativeTime(), RELATIVE_UNITS, relativeTimeFormatter, TEST_RESULT_STATUS_SEVERITY (+23 more)

### Community 2 - "Backend App Bootstrap & Config"
Cohesion: 0.07
Nodes (49): getLogLevel(), DB, ProfileRepository, ProjectMemberRepository, RefreshTokenRepository, Repository, TestCaseRepository, main() (+41 more)

### Community 3 - "Domain Model & Product Rules"
Cohesion: 0.07
Nodes (51): Astro Starlight Card/CardGrid components, Astro Starlight documentation framework, Two separate role systems: global account role vs per-project role, Google OAuth-only sign-in, Testify has no custom REST API, Postgres Row-Level Security (RLS), Test Case sequencing/ordering within a Test Plan, Step mode: detailed (+43 more)

### Community 4 - "Test Case Backend (Domain+Service+Repo)"
Cohesion: 0.09
Nodes (33): Time, fromDomainTestCase(), Context, DB, Query, TestCase, TestCaseStep, NewTestCaseRepository() (+25 more)

### Community 5 - "Frontend App Layout & Theme"
Cohesion: 0.06
Nodes (45): AppLayout(), AppLayoutInner(), AppMenu(), EnrichedProject, AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar() (+37 more)

### Community 6 - "Frontend Package Dependencies"
Cohesion: 0.10
Nodes (21): devDependencies, oxlint, sharp, @types/node, @types/react, @types/react-dom, typescript, vite (+13 more)

### Community 7 - "Frontend Issue Management UI"
Cohesion: 0.08
Nodes (33): App(), AdminRoute(), ProtectedRoute(), useAuthContext(), useDashboard(), useDialogResizeFix(), useProjectAccessGuard(), useProjectBreadcrumbItems() (+25 more)

### Community 8 - "Frontend Auth & User Settings"
Cohesion: 0.09
Nodes (23): STATUS_OPTIONS, TestPlanDialog(), TestPlanDialogProps, AppToast(), AttachmentPanel(), UserHoverCard(), UserHoverCardProps, TEST_PLAN_STATUS_LABEL (+15 more)

### Community 9 - "Frontend Test Case UI"
Cohesion: 0.11
Nodes (19): date-fns, dependencies, date-fns, @hookform/resolvers, primeicons, react-dom, react-hook-form, react-markdown (+11 more)

### Community 10 - "Frontend Routes & Pages"
Cohesion: 0.14
Nodes (15): PRIORITY_OPTIONS, STEP_TYPE_OPTIONS, TestSuiteItemDialog(), TestSuiteItemDialogMode, TestSuiteItemDialogProps, CharacterCount(), CharacterCountProps, TEST_CASE_PRIORITY_LABEL (+7 more)

### Community 11 - "Frontend Test Run/Plan Detail UI"
Cohesion: 0.06
Nodes (54): BulkActionsBar(), BulkActionsBarProps, dataTablePaginatorProps, dataTablePaginatorTemplate, FilterToolbar(), FilterToolbarProps, RowActionsMenu(), RowActionsMenuProps (+46 more)

### Community 12 - "Backend Profile Repository"
Cohesion: 0.13
Nodes (18): Time, fromDomainProfile(), Context, DB, Profile, NewProfileRepository(), toDomainProfile(), fromDomainProfile() (+10 more)

### Community 13 - "Backend Issue HTTP Layer"
Cohesion: 0.13
Nodes (18): FromIssue(), FromIssues(), Issue, Time, toDomainGithubLinks(), Context, Service, NewIssueHandler() (+10 more)

### Community 14 - "Backend Test Plan HTTP Layer"
Cohesion: 0.11
Nodes (20): BindAndValidate(), Context, FromTestPlan(), FromTestPlanCase(), FromTestPlanCases(), FromTestPlans(), TestPlan, Time (+12 more)

### Community 15 - "Backend Issue Domain & Service"
Cohesion: 0.23
Nodes (11): Internal(), Context, fromDomainIssue(), Context, DB, Issue, Status, NewIssueRepository() (+3 more)

### Community 16 - "Backend Test Case HTTP Layer"
Cohesion: 0.60
Nodes (3): computeSummary(), Summary, WithResults

### Community 17 - "Backend Project HTTP Layer"
Cohesion: 0.13
Nodes (18): Time, FromProject(), FromProjects(), Project, Time, Context, Service, NewProjectHandler() (+10 more)

### Community 18 - "Backend Test Run Service"
Cohesion: 0.26
Nodes (7): Validation(), Context, Repository, TestCaseRepository, TestRun, NewService(), Service

### Community 19 - "Frontend Project Management UI"
Cohesion: 0.20
Nodes (12): fromDomainTestRun(), Context, DB, Status, TestResult, TestRun, NewTestRunRepository(), toDomainTestResult() (+4 more)

### Community 20 - "Backend Test Plan Repository (MySQL)"
Cohesion: 0.18
Nodes (13): Time, fromDomainTestPlan(), Context, DB, TestPlan, TestPlanCase, NewTestPlanRepository(), toDomainTestPlan() (+5 more)

### Community 21 - "Frontend Test Suite UI"
Cohesion: 0.23
Nodes (11): MODE_ICON, ThemeToggle(), applyTheme(), getSystemPrefersDark(), resolve(), THEME_HREF, ThemeContext, ThemeContextValue (+3 more)

### Community 22 - "Frontend TS App Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 23 - "Architecture & Product Docs"
Cohesion: 0.12
Nodes (23): Architectural Risks & Notes, API Boundary Proposal for future Go backend, Testify Platform Evolution - Architecture Redesign, Public Profile Rescoped to Functional Identity Only, backend docker-compose.yml (mysql+postgres), MySQL mysql_native_password auth plugin choice, backend/ Go Backend PENDING Status, Repository Layer Swappable for Future Backend (+15 more)

### Community 24 - "Backend Issue Repository (MySQL)"
Cohesion: 0.16
Nodes (17): FromTestCase(), FromTestCases(), FromTestCaseWithDetails(), TestCase, Time, Context, Service, NewTestCaseHandler() (+9 more)

### Community 25 - "Backend Test Run HTTP Layer"
Cohesion: 0.21
Nodes (9): FromTestRun(), FromTestRuns(), TestRun, Context, Service, NewTestRunHandler(), OK(), TestRunResponse (+1 more)

### Community 26 - "Frontend Test Plan UI"
Cohesion: 0.11
Nodes (28): PROJECT_STATUS_LABEL, PROJECT_STATUS_SEVERITY, CreateProjectDialog(), CreateProjectDialogProps, DuplicateProjectDialog(), DuplicateProjectDialogProps, DangerZoneTab(), DangerZoneTabProps (+20 more)

### Community 27 - "Backend Test Plan Repository (Postgres)"
Cohesion: 0.21
Nodes (10): isDuplicateKeyErr(), fromDomainTestPlan(), Context, DB, TestPlan, TestPlanCase, NewTestPlanRepository(), toDomainTestPlan() (+2 more)

### Community 28 - "Backend Issue Repository (Postgres)"
Cohesion: 0.31
Nodes (7): Context, DB, NewTestCaseSnapshotRepository(), NewTestPlanCaseReader(), TestCaseSnapshotRepository, TestPlanCaseReader, TestCaseStepSnapshot

### Community 29 - "Frontend Test Run Dialogs"
Cohesion: 0.10
Nodes (25): ActivityPanel(), ActivityPanelProps, ActivityPanelSkeleton(), CommentEditor(), CommentEditorProps, MarkdownPreview(), MarkdownPreviewProps, describeSystemEvent() (+17 more)

### Community 30 - "AGENTS.md Conventions"
Cohesion: 0.14
Nodes (20): Clean Architecture Layering (Repository→Service→Hook→Component), Domain Model - Test Management Workflow, Google OAuth Setup Steps, Module Creation Order convention, PageHeader Convention (Judul Halaman), TestManager (shiftech-test-mgr), Layered Architecture Flow (Page→Hook→Service→Repository→Supabase), React Query + Supabase Realtime Data Freshness (E14) (+12 more)

### Community 31 - "Backend App Error Types"
Cohesion: 0.19
Nodes (16): mapExternalLinks(), mapIssueRow(), mapModuleRow(), mapProfileRow(), mapTagRow(), mapTestCaseRow(), mapTestPlanCaseRow(), mapTestResultRow() (+8 more)

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
Cohesion: 0.25
Nodes (7): Aturan wajib untuk semua ticket (jangan diulang per-ticket, baca sekali), Di luar scope dokumen ini, Ticket — Prioritas Menengah (ada logic, tapi lebih sempit scope-nya), Ticket — Prioritas Rendah (pass-through, test tipis/opsional), Ticket — Prioritas Tinggi (business logic padat, ROI test tertinggi), Urutan pengerjaan yang disarankan, Work Breakdown — Unit Test Service Layer (`frontend/src/services/`)

### Community 36 - "Backend Google OAuth Service"
Cohesion: 0.20
Nodes (14): GoogleConfig, googleUserInfo, Service, TokenPair, Unauthorized(), Context, Duration, Profile (+6 more)

### Community 37 - "Backend Test Case Repository (MySQL)"
Cohesion: 0.83
Nodes (3): DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 38 - "Backend Test Run DTO"
Cohesion: 0.09
Nodes (31): ProfileView(), ProfileViewProps, ProfileViewSkeleton(), Breadcrumb(), BreadcrumbItem, BreadcrumbProps, UsernamePicker(), UsernamePickerProps (+23 more)

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
Cohesion: 0.13
Nodes (19): RFC-4180, ExcelImportPanel(), downloadTestSuiteCsv(), escapeCsvField(), formatStepsCell(), CSV_TEMPLATE_SAMPLE_ROWS, downloadCsvTemplate(), EXPECTED_HEADERS (+11 more)

### Community 48 - "Backend Project Membership & Auth Policy"
Cohesion: 0.27
Nodes (9): Forbidden(), Context, Context, CanDeleteProject(), CanEditProject(), CanManageIssues(), CanManageTests(), Member (+1 more)

### Community 49 - "Backend RBAC Middleware"
Cohesion: 0.11
Nodes (23): TestSuiteDialog(), TestSuiteDialogMode, TestSuiteDialogProps, VISIBILITY_OPTIONS, ColumnHeaderMenu(), ColumnHeaderMenuProps, PageHeader(), PageHeaderProps (+15 more)

### Community 50 - "Backend JWT & Auth Service"
Cohesion: 0.20
Nodes (11): Context, DB, Next(), fromDomainModule(), Context, DB, Module, NewModuleRepository() (+3 more)

### Community 51 - "Backend Test Role Repository (MySQL)"
Cohesion: 0.21
Nodes (11): Error, Kind, As(), Conflict(), NotFound(), Context, DB, TestRole (+3 more)

### Community 52 - "Backend Module Service"
Cohesion: 0.30
Nodes (7): Context, Module, Repository, NewService(), CreateInput, Service, UpdateInput

### Community 53 - "Backend Auth HTTP Handler"
Cohesion: 0.26
Nodes (9): fromDomainIssue(), Context, DB, Issue, Status, NewIssueRepository(), toDomainIssue(), toDomainIssues() (+1 more)

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
Cohesion: 0.18
Nodes (17): FromTestResult(), FromTestResults(), FromTestResultStep(), FromTestRunSummary(), FromTestRunWithResults(), Summary, Time, CompleteTestRunRequest (+9 more)

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
Cohesion: 0.39
Nodes (8): Updated Bounded Contexts (Platform vs Testing), Entity-by-entity Disposition table, Migration Strategy (8 ordered steps), Organization-readiness without building organizations, project_members Invite/Accept Lifecycle, Project Ownership + Visibility, Test Suite Ownership + Visibility, users/profiles Identity Split

### Community 67 - "Backend Auth HTTP DTO"
Cohesion: 0.17
Nodes (12): FromProfile(), Profile, Context, ProfileRepository, Service, NewAuthHandler(), GoogleCallbackRequest, LogoutRequest (+4 more)

### Community 68 - "supabaseClient.ts"
Cohesion: 0.17
Nodes (10): supabase, mapNotificationRow(), mapTestRunRow(), mapUserRow(), moduleRepository, notificationRepository, tagRepository, testRoleRepository (+2 more)

### Community 69 - "Backend HTTP Response Helpers"
Cohesion: 0.38
Nodes (6): Context, DB, TestRole, NewTestRoleRepository(), toDomainTestRole(), TestRoleRepository

### Community 70 - "Frontend Lint Config"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 71 - "Architecture & Design Review Docs"
Cohesion: 0.25
Nodes (9): Database Schema (Supabase/Postgres), Entity Code Auto-Generate mechanism (next_entity_code), Test Management Workflow design rationale, Testing Domain (unchanged), Decision: Full history instead of last-result, Design Review - Test Management v2, E08 - Test Management v2, Entity Code Auto-Generate Feature (+1 more)

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
Cohesion: 0.14
Nodes (16): mapProjectMemberInvitationRow(), mapProjectMemberRow(), mapProjectMemberWithProfileRow(), mapTestCaseStepRow(), mapTestSuiteItemRow(), mapTestSuiteItemStepRow(), mapTestSuiteRow(), projectMemberRepository (+8 more)

### Community 100 - "ResultStep"
Cohesion: 0.27
Nodes (10): fromDomainTestCase(), Context, DB, Query, TestCase, TestCaseStep, NewTestCaseRepository(), toDomainTestCase() (+2 more)

### Community 116 - "MentionTextarea.tsx"
Cohesion: 0.33
Nodes (4): MentionTextarea(), MentionTextareaProps, Suggestion, Trigger

### Community 123 - "frontend/scripts/generate-icons.mjs"
Cohesion: 0.15
Nodes (12): buf, dirEntries, __dirname, header, icoSizes, imageBuffers, maskableOffset, pngBuffers (+4 more)

### Community 124 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 125 - "dashboardRepository.ts"
Cohesion: 0.22
Nodes (7): mapProjectRow(), mapTestPlanRow(), DashboardCounts, dashboardRepository, MyWorkIssue, dashboardService, Issue

### Community 126 - "NotFound"
Cohesion: 0.08
Nodes (48): IssueEditor(), IssueEditorProps, IssueFormData, PRIORITY_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, ISSUE_PRIORITY_LABEL, ISSUE_PRIORITY_SEVERITY (+40 more)

### Community 127 - "RequireAuth"
Cohesion: 0.33
Nodes (8): extractBearerToken(), Context, MiddlewareFunc, Service, RequireAdmin(), RequireApproved(), RequireAuth(), UserIDFromContext()

### Community 128 - "frontend/package.json"
Cohesion: 0.22
Nodes (9): scripts, build, build-push, dev, lint, preview, test, test:coverage (+1 more)

### Community 129 - "auditLogRepository.ts"
Cohesion: 0.31
Nodes (6): mapActivityEntryRow(), activityRepository, AuditLogEntry, auditLogRepository, auditLogService, ActivityEntry

### Community 130 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 132 - "SupabaseStorageAdapter.ts"
Cohesion: 0.20
Nodes (8): AttachmentPanelProps, mapAttachmentRow(), entityAttachmentRepository, storageAdapter, StorageAdapter, UploadedFile, supabaseStorageAdapter, AttachmentEntityType

### Community 133 - "primeicons"
Cohesion: 0.64
Nodes (8): MiddlewareFunc, ProjectMemberRepository, RequireProjectAccess(), RequireProjectDelete(), RequireProjectEdit(), RequireProjectManageIssues(), RequireProjectManageTests(), requireProjectRole()

### Community 134 - "primereact"
Cohesion: 0.31
Nodes (6): Duration, Profile, NewService(), Claims, Service, RegisteredClaims

### Community 135 - ".Update"
Cohesion: 0.38
Nodes (6): Context, DB, Tag, NewTagRepository(), toDomainTag(), TagRepository

### Community 136 - "TestCaseSnapshotRepository"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 137 - "Created"
Cohesion: 0.31
Nodes (9): Created(), Context, HTTPErrorHandler(), httpMessage(), OKWithMeta(), statusFor(), HTTPError, envelope (+1 more)

### Community 138 - "TestCaseSnapshotRepository"
Cohesion: 0.67
Nodes (5): DB, NewTestCaseSnapshotRepository(), NewTestPlanCaseReader(), TestCaseSnapshotRepository, TestPlanCaseReader

### Community 142 - "ProjectMemberRepository"
Cohesion: 0.83
Nodes (3): DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 144 - "testplan/entity.go"
Cohesion: 0.26
Nodes (6): Context, Issue, Repository, Status, NewService(), Service

### Community 145 - "Recover"
Cohesion: 0.20
Nodes (10): Logger, MiddlewareFunc, Recover(), Logger, ProjectMemberRepository, Service, NewRouter(), Echo (+2 more)

### Community 146 - "projectDuplicateService.test.ts"
Cohesion: 0.18
Nodes (7): TestCaseDetail, AddCaseToPlanDialog(), AddCaseToPlanDialogProps, makeTestCase(), makeTestCaseWithDetails(), TestCase, TestCaseWithDetails

### Community 147 - "entityAttachmentRepository.ts"
Cohesion: 0.27
Nodes (11): Time, Priority, CreateInput, GithubLink, Issue, Link, Priority, Status (+3 more)

### Community 148 - "testSuiteService.test.ts"
Cohesion: 0.50
Nodes (3): Repository, TestCaseRepository, TestPlanCaseRepository

## Knowledge Gaps
- **325 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `github.com/shiftech/testmgr-backend`, `TagLink`, `Summary` (+320 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Internal()` connect `Backend Issue Domain & Service` to `Test Run Repository (MySQL+Postgres)`, `Test Case Backend (Domain+Service+Repo)`, `.Update`, `Backend Profile Repository`, `Recover`, `Frontend Project Management UI`, `Backend Test Plan Repository (MySQL)`, `Backend Test Plan Repository (Postgres)`, `Backend Issue Repository (Postgres)`, `Backend Google OAuth Service`, `Backend Project Repository (MySQL)`, `Backend Project Repository (Postgres)`, `Backend Module Repository (MySQL)`, `Backend Project Membership & Auth Policy`, `Backend JWT & Auth Service`, `Backend Test Role Repository (MySQL)`, `Backend Auth HTTP Handler`, `Backend Attachment Repository (MySQL)`, `Backend Tag Repository (MySQL)`, `Backend Attachment Repository (Postgres)`, `Backend Refresh Token Repository (MySQL)`, `Backend Refresh Token Repository (Postgres)`, `Backend HTTP Response Helpers`, `ResultStep`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Why does `Validation()` connect `Backend Test Run Service` to `Backend Test Plan Service`, `Test Case Backend (Domain+Service+Repo)`, `Backend Project Service`, `Backend Issue HTTP Layer`, `Backend Attachment HTTP DTO`, `Backend Test Plan HTTP Layer`, `testplan/entity.go`, `Backend Project HTTP Layer`, `Backend Test Role Repository (MySQL)`, `Backend Module Service`, `Backend Issue Repository (MySQL)`, `Backend Test Run HTTP Layer`, `Backend Attachment Service`, `Backend Tag Service`, `Backend Test Role Service`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `BindAndValidate()` connect `Backend Test Plan HTTP Layer` to `Backend Auth HTTP DTO`, `Backend Module HTTP DTO`, `Backend Tag HTTP DTO`, `Backend Test Role HTTP DTO`, `Backend Issue HTTP Layer`, `Backend Attachment HTTP DTO`, `Backend Project HTTP Layer`, `Backend Test Run Service`, `Backend Issue Repository (MySQL)`, `Backend Test Run HTTP Layer`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Are the 160 inferred relationships involving `Internal()` (e.g. with `.issueTokenPair()` and `toDomainIssues()`) actually correct?**
  _`Internal()` has 160 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `OK()` (e.g. with `.List()` and `.Me()`) actually correct?**
  _`OK()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 33 inferred relationships involving `Validation()` (e.g. with `.Create()` and `BindAndValidate()`) actually correct?**
  _`Validation()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `github.com/shiftech/testmgr-backend` to the rest of the system?**
  _325 weakly-connected nodes found - possible documentation gaps or missing edges._