# Graph Report - shiftech-test-mgr-backend  (2026-08-02)

## Corpus Check
- 652 files · ~301,299 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3477 nodes · 8696 edges · 242 communities (195 shown, 47 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 718 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `463d60ec`
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
- TestCaseSnapshotRepository
- RequireAuth
- frontend/package.json
- auditLogRepository.ts
- opencode.json
- graphify.js
- ProjectMemberRepository
- primeicons
- primereact
- TestCaseSnapshotRepository
- Created
- TestCaseSnapshotRepository
- primereact
- @supabase/supabase-js
- @tanstack/react-query
- ProjectMemberRepository
- test-plans/components/dialogs/DuplicateTestPlanDialog.tsx
- Recover
- projectDuplicateService.test.ts
- Backend Go — Validation Spike (bukti arsitektur bekerja)
- Backend Go — Feature Backlog
- react-hook-form
- attachmentService.test.ts
- react
- main
- NewModuleRepo
- testcase_repo.go
- NewTestRoleRepo
- NewTestCaseService
- Backend Go — Roadmap Eksekusi
- IssueService
- main
- NewTagRepo
- Backend Architecture — Testify Platform (Go)
- RequireAuth
- System Architecture - Client-side SPA
- mysql/model/issue.go
- mysql/model/testcase.go
- mysql/model/testrun.go
- mysql/model/user.go
- postgres/model/issue.go
- postgres/model/testcase.go
- postgres/model/testrun.go
- postgres/model/user.go
- .List
- NewTestRoleService
- Catatan Porting — NvlFr-testify (Node) → backend Go ini
- HealthHandler
- Layer
- TestPlan
- TestPlan
- Fase 2 — Repository Layer
- mysql/model/testcase_snapshot.go
- postgres/model/testcase_snapshot.go
- Fase 4 — Write Tools + Governance
- Fase 6 — Requirement Tools + Artifact Storage
- Attachment
- Module
- Project
- Tag
- TestRole
- Attachment
- Module
- Project
- Tag
- TestRole
- Recover
- health_handler_test.go
- New
- Worklog
- backend_archive/README.md
- rest-api/README.md
- react-dom
- vitest
- repositories/issueRepository.test.ts
- Architectural Risks & Notes
- github.com/shiftech/testify-platform
- response.go
- react-hook-form
- react-markdown
- @testing-library/jest-dom
- @types/react-dom
- SupabaseStorageAdapter.ts
- NewTestResultService
- test-plans/components/dialogs/DuplicateTestPlanDialog.tsx

## God Nodes (most connected - your core abstractions)
1. `Internal()` - 162 edges
2. `react` - 71 edges
3. `useAuthContext()` - 67 edges
4. `writeReg()` - 44 edges
5. `OK()` - 41 edges
6. `writeSession()` - 35 edges
7. `call()` - 35 edges
8. `Validation()` - 35 edges
9. `BindAndValidate()` - 35 edges
10. `allWriteScopes()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `System Architecture - Client-side SPA` --semantically_similar_to--> `Why No Controller/API Layer`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `UI Architecture - PrimeReact` --semantically_similar_to--> `PrimeReact UI Library Usage`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Testify Landing Page` --semantically_similar_to--> `Testify Vision`  [INFERRED] [semantically similar]
  landing/index.html → docs/PRODUCT_CONSTITUTION.md
- `Domain Model - Test Management Workflow` --conceptually_related_to--> `Test Management Workflow design rationale`  [INFERRED]
  AGENTS.md → docs/ARCHITECTURE.md
- `PageHeader Convention (Judul Halaman)` --conceptually_related_to--> `TestManager Project Overview`  [INFERRED]
  AGENTS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Platform Evolution V2 governance chain (Constitution → Architecture → Roadmap)** — constitution_testify, archv2_platform_evolution, roadmapv2_testify, todo_sprint_board [EXTRACTED 1.00]
- **Test Management Workflow documented across PRD/Architecture/Design-Review/AGENTS** — docs_prd_test_management_concept, arch_test_management_workflow_rationale, design_review_full_history_decision, agents_domain_model_test_management [INFERRED 0.90]
- **E12 Epic spanning Tasks, Agent Prompt, PRD and Architecture** — docs_tasks_e12_issue_tracking_v2, docs_prompts_e12_agent_prompt, docs_prd_issue_tracking_v2, arch_test_suite_library_e17 [INFERRED 0.75]
- **Test execution history flow: Plan -> Run -> Result -> Issue** — entity_testplan, entity_testrun, entity_testresult, entity_issue [EXTRACTED 0.90]
- **Identity and access model: User/Profile split with per-project roles** — entity_user, entity_profile, entity_projectmember, role_manager, role_supervisor, role_tester, role_member [EXTRACTED 0.85]
- **Starlight docs site branding assets** — public_docs_public_favicon_svg, public_docs_src_assets_houston, astro_starlight_framework [INFERRED 0.75]

## Communities (242 total, 47 thin omitted)

### Community 0 - "Test Run Repository (MySQL+Postgres)"
Cohesion: 0.10
Nodes (28): NotFound(), Time, Context, TestResult, TestResultStep, toDomainTestResult(), toDomainTestResultStep(), fromDomainTestRun() (+20 more)

### Community 1 - "Frontend Repository/Mapper Layer"
Cohesion: 0.10
Nodes (27): ColumnHeaderMenu(), ColumnHeaderMenuProps, PageHeader(), PageHeaderProps, RelativeTime(), RelativeTimeProps, NOW, formatDate() (+19 more)

### Community 2 - "Backend App Bootstrap & Config"
Cohesion: 0.07
Nodes (49): getLogLevel(), DB, ProfileRepository, ProjectMemberRepository, RefreshTokenRepository, Repository, TestCaseRepository, main() (+41 more)

### Community 3 - "Domain Model & Product Rules"
Cohesion: 0.07
Nodes (51): Astro Starlight Card/CardGrid components, Astro Starlight documentation framework, Two separate role systems: global account role vs per-project role, Google OAuth-only sign-in, Testify has no custom REST API, Postgres Row-Level Security (RLS), Test Case sequencing/ordering within a Test Plan, Step mode: detailed (+43 more)

### Community 4 - "Test Case Backend (Domain+Service+Repo)"
Cohesion: 0.08
Nodes (43): errHandler(), CallToolRequest, CallToolResult, Context, T, isErrorHandler(), newFakeRepo(), okHandler() (+35 more)

### Community 5 - "Frontend App Layout & Theme"
Cohesion: 0.07
Nodes (41): AppLayout(), AppLayoutInner(), AppMenu(), EnrichedProject, AppMenuitem(), AppMenuSeparator(), MenuItemModel, AppSidebar() (+33 more)

### Community 6 - "Frontend Package Dependencies"
Cohesion: 0.09
Nodes (23): devDependencies, jsdom, oxlint, sharp, @testing-library/react, @testing-library/user-event, @types/node, @types/react (+15 more)

### Community 7 - "Frontend Issue Management UI"
Cohesion: 0.06
Nodes (44): App(), AdminRoute(), ProtectedRoute(), ProfileViewSkeleton(), AppToast(), UsernamePicker(), describeSystemEvent(), eventTypeLabel() (+36 more)

### Community 8 - "Frontend Auth & User Settings"
Cohesion: 0.07
Nodes (26): ActivityPanel(), ActivityPanelProps, ActivityPanelSkeleton(), CommentEditor(), CommentEditorProps, MarkdownPreview(), MarkdownPreviewProps, MentionTextarea() (+18 more)

### Community 9 - "Frontend Test Case UI"
Cohesion: 0.09
Nodes (23): date-fns, dependencies, date-fns, @hookform/resolvers, primeflex, primeicons, primereact, react (+15 more)

### Community 10 - "Frontend Routes & Pages"
Cohesion: 0.20
Nodes (11): Conflict(), fromDomainTestRun(), Context, DB, Status, TestRun, NewTestRunRepository(), toDomainTestRun() (+3 more)

### Community 11 - "Frontend Test Run/Plan Detail UI"
Cohesion: 0.09
Nodes (39): TestSuiteDialog(), TestSuiteDialogMode, TestSuiteDialogProps, VISIBILITY_OPTIONS, BulkActionsBar(), BulkActionsBarProps, dataTablePaginatorProps, dataTablePaginatorTemplate (+31 more)

### Community 12 - "Backend Profile Repository"
Cohesion: 0.13
Nodes (18): Time, fromDomainProfile(), Context, DB, Profile, NewProfileRepository(), toDomainProfile(), fromDomainProfile() (+10 more)

### Community 13 - "Backend Issue HTTP Layer"
Cohesion: 0.13
Nodes (17): FromIssue(), FromIssues(), Issue, Time, toDomainGithubLinks(), Context, Service, NewIssueHandler() (+9 more)

### Community 14 - "Backend Test Plan HTTP Layer"
Cohesion: 0.12
Nodes (19): FromTestPlan(), FromTestPlanCase(), FromTestPlanCases(), FromTestPlans(), TestPlan, Time, Context, Service (+11 more)

### Community 15 - "Backend Issue Domain & Service"
Cohesion: 0.17
Nodes (15): Internal(), Context, DB, RefreshToken, NewRefreshTokenRepository(), fromDomainIssue(), Context, DB (+7 more)

### Community 16 - "Backend Test Case HTTP Layer"
Cohesion: 0.06
Nodes (37): useProjectAccessGuard(), renderRole(), useProjectRole(), renderTabParam(), TABS, useTabQueryParam(), CreateProjectDialog(), CreateTestRunDialog() (+29 more)

### Community 17 - "Backend Project HTTP Layer"
Cohesion: 0.13
Nodes (18): Time, FromProject(), FromProjects(), Project, Time, Context, ProjectHandler, Service (+10 more)

### Community 18 - "Backend Test Run Service"
Cohesion: 0.16
Nodes (13): Validation(), computeSummary(), Context, Repository, Summary, TestCaseRepository, TestRun, NewService() (+5 more)

### Community 19 - "Frontend Project Management UI"
Cohesion: 0.12
Nodes (13): AttachmentPanel(), UserHoverCardProps, toastHelper, queryKeys, useTestPlans(), EMPTY_SUMMARY, Summary, PRIORITY_OPTIONS (+5 more)

### Community 20 - "Backend Test Plan Repository (MySQL)"
Cohesion: 0.14
Nodes (16): isDuplicateKeyErr(), Context, DB, Tag, NewTagRepository(), toDomainTag(), fromDomainTestPlan(), Context (+8 more)

### Community 21 - "Frontend Test Suite UI"
Cohesion: 0.22
Nodes (12): MODE_ICON, ThemeToggle(), applyTheme(), getSystemPrefersDark(), resolve(), renderTheme(), THEME_HREF, ThemeContext (+4 more)

### Community 22 - "Frontend TS App Config"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+15 more)

### Community 23 - "Architecture & Product Docs"
Cohesion: 0.17
Nodes (16): Testify Platform Evolution - Architecture Redesign, Public Profile Rescoped to Functional Identity Only, Auth & RBAC (Google Login), Core Features / Core Domains, Feature Acceptance Rule, What Testify Is NOT (incl. not a Social Network), Simplicity First principle, Testify Product Constitution (+8 more)

### Community 24 - "Backend Issue Repository (MySQL)"
Cohesion: 0.12
Nodes (25): Time, FromTestCase(), FromTestCases(), FromTestCaseWithDetails(), TestCase, Time, Context, Service (+17 more)

### Community 25 - "Backend Test Run HTTP Layer"
Cohesion: 0.11
Nodes (26): FromTestResult(), FromTestResults(), FromTestResultStep(), FromTestRun(), FromTestRuns(), FromTestRunSummary(), FromTestRunWithResults(), Summary (+18 more)

### Community 26 - "Frontend Test Plan UI"
Cohesion: 0.05
Nodes (26): ProfileViewProps, CreateProjectDialogProps, DuplicateProjectDialogProps, MockDashboardSeed, createMockProjectRepository(), createMockTestSuiteRepository(), projectRepositoryAdapter, projectRepositoryAdapter (+18 more)

### Community 27 - "Backend Test Plan Repository (Postgres)"
Cohesion: 0.14
Nodes (11): createMockTestResultRepository(), sampleResult, sampleResultWithSteps, testResultRepositoryAdapter, testResultRepositoryAdapter, TestResultRepository, testResultRepository, TestResult (+3 more)

### Community 28 - "Backend Issue Repository (Postgres)"
Cohesion: 0.36
Nodes (6): Context, DB, NewTestCaseSnapshotRepository(), NewTestPlanCaseReader(), TestCaseSnapshotRepository, TestPlanCaseReader

### Community 29 - "Frontend Test Run Dialogs"
Cohesion: 0.07
Nodes (52): TestPlanStatus, Time, CallToolRequest, CallToolResult, Context, ToolAdder, isUUID(), T (+44 more)

### Community 30 - "AGENTS.md Conventions"
Cohesion: 0.13
Nodes (20): Clean Architecture Layering (Repository→Service→Hook→Component), Google OAuth Setup Steps, Module Creation Order convention, PageHeader Convention (Judul Halaman), TestManager (shiftech-test-mgr), Layered Architecture Flow (Page→Hook→Service→Repository→Supabase), React Query + Supabase Realtime Data Freshness (E14), System Architecture - Client-side SPA (+12 more)

### Community 31 - "Backend App Error Types"
Cohesion: 0.16
Nodes (26): supabase, mapActivityEntryRow(), mapAttachmentRow(), mapExternalLinks(), mapIssueRow(), mapModuleRow(), mapNotificationRow(), mapProfileRow() (+18 more)

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
Cohesion: 0.23
Nodes (12): GoogleConfig, googleUserInfo, Service, TokenPair, Unauthorized(), Context, Duration, Profile (+4 more)

### Community 37 - "Backend Test Case Repository (MySQL)"
Cohesion: 0.11
Nodes (26): IssueEditor(), PRIORITY_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, Breadcrumb(), BreadcrumbItem, BreadcrumbProps, memberSelectLabel() (+18 more)

### Community 38 - "Backend Test Run DTO"
Cohesion: 0.10
Nodes (33): ProfileView(), EVENT_TYPE_LABEL, STATUS_LABEL_BY_ENTITY, ISSUE_PRIORITY_SEVERITY, ISSUE_STATUS_LABEL, ISSUE_STATUS_SEVERITY, ISSUE_TYPE_SEVERITY, PROJECT_MEMBER_ROLE_LABEL (+25 more)

### Community 39 - "Backend Module HTTP DTO"
Cohesion: 0.20
Nodes (11): FromModule(), FromModules(), Module, Time, Context, Service, NewModuleHandler(), CreateModuleRequest (+3 more)

### Community 40 - "Backend Tag HTTP DTO"
Cohesion: 0.20
Nodes (11): FromTag(), FromTags(), Tag, Time, Context, Service, NewTagHandler(), CreateTagRequest (+3 more)

### Community 41 - "Backend Test Role HTTP DTO"
Cohesion: 0.12
Nodes (19): FromTestRole(), FromTestRoles(), TestRole, Time, Context, Service, NewAttachmentHandler(), Context (+11 more)

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
Cohesion: 0.48
Nodes (6): FromAttachment(), FromAttachments(), Attachment, Time, AttachmentResponse, CreateAttachmentRequest

### Community 46 - "Backend Module Repository (MySQL)"
Cohesion: 0.20
Nodes (11): Context, DB, Next(), fromDomainModule(), Context, DB, Module, NewModuleRepository() (+3 more)

### Community 47 - "Frontend CSV Import"
Cohesion: 0.12
Nodes (17): RFC-4180, ExcelImportPanel(), downloadTestSuiteCsv(), escapeCsvField(), formatStepsCell(), CSV_TEMPLATE_SAMPLE_ROWS, downloadCsvTemplate(), EXPECTED_HEADERS (+9 more)

### Community 48 - "Backend Project Membership & Auth Policy"
Cohesion: 0.42
Nodes (7): Forbidden(), CanDeleteProject(), CanEditProject(), CanManageIssues(), CanManageTests(), Member, MemberRole

### Community 49 - "Backend RBAC Middleware"
Cohesion: 0.20
Nodes (48): allWriteScopes(), assertErrorResult(), call(), CallToolRequest, CallToolResult, T, resultText(), TestAddTestPlanCases() (+40 more)

### Community 50 - "Backend JWT & Auth Service"
Cohesion: 0.36
Nodes (7): fromDomainModule(), Context, DB, Module, NewModuleRepository(), toDomainModule(), ModuleRepository

### Community 51 - "Backend Test Role Repository (MySQL)"
Cohesion: 0.38
Nodes (6): Context, DB, TestRole, NewTestRoleRepository(), toDomainTestRole(), TestRoleRepository

### Community 52 - "Backend Module Service"
Cohesion: 0.30
Nodes (7): Context, Module, Repository, NewService(), CreateInput, Service, UpdateInput

### Community 53 - "Backend Auth HTTP Handler"
Cohesion: 0.26
Nodes (6): Context, Issue, Repository, Status, NewService(), Service

### Community 54 - "Backend Attachment Repository (MySQL)"
Cohesion: 0.36
Nodes (7): fromDomainAttachment(), Attachment, Context, DB, NewAttachmentRepository(), toDomainAttachment(), AttachmentRepository

### Community 55 - "Backend Tag Repository (MySQL)"
Cohesion: 0.10
Nodes (18): STATUS_OPTIONS, TestPlanDialog(), TestPlanDialogProps, PRIORITY_OPTIONS, STEP_TYPE_OPTIONS, TestSuiteItemDialog(), TestSuiteItemDialogMode, TestSuiteItemDialogProps (+10 more)

### Community 56 - "Backend Attachment Repository (Postgres)"
Cohesion: 0.36
Nodes (7): fromDomainAttachment(), Attachment, Context, DB, NewAttachmentRepository(), toDomainAttachment(), AttachmentRepository

### Community 57 - "Backend Tag Repository (Postgres)"
Cohesion: 0.10
Nodes (18): T, TestRun, TestRun, TestTestRunServiceCreateRecordComplete(), Context, TestRun, NewTestRunService(), CreateTestRunInput (+10 more)

### Community 58 - "Platform Evolution V2 Roadmap"
Cohesion: 0.29
Nodes (10): MVP Scope After Redesign, MVP Success Criteria (9-step golden path), Golden Path 9-step flow, Phase 1 - Identity Split (users+profiles), Phase 2 - Drop Approval Gate, Phase 3 - Project Ownership + Visibility, Phase 4 - Membership Invite/Accept Flow, Phase 5 - Test Suite Template Ownership + Visibility (+2 more)

### Community 59 - "Backend Attachment Service"
Cohesion: 0.33
Nodes (6): CreateInput, Service, Attachment, Context, Repository, NewService()

### Community 60 - "Backend Refresh Token Repository (MySQL)"
Cohesion: 0.18
Nodes (13): Time, fromDomainTestPlan(), Context, DB, TestPlan, TestPlanCase, NewTestPlanRepository(), toDomainTestPlan() (+5 more)

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
Nodes (11): Attachment via Storage Adapter, Issue & Feature Tracking (N:M to Test Result), Sequence (urutan eksekusi) di Test Plan, Test Case step_type (simple/detailed), Konsep Test Management (Project→Module→TestCase→TestPlan→TestRun→TestResult→Issue), Test Run Unplanned/Custom, E12 Agent Prompt Document, E12 - Issue & Feature Tracking v2, Structured Steps, Attachment Adapter (+3 more)

### Community 65 - "Task Breakdown Docs (Epics)"
Cohesion: 0.28
Nodes (9): Auth & RBAC Detail (project-scoped RLS), RBAC per-project (project_members roles), E01 - Fondasi Arsitektur, E09 - Restrukturisasi Monorepo, E13 - Test Run Detail Page + Sequence, E14 - React Query + Realtime Sync, E15 - RBAC Per-Project, TASKS - TestManager work breakdown (+1 more)

### Community 66 - "Architecture V2 Migration Docs"
Cohesion: 0.39
Nodes (8): Updated Bounded Contexts (Platform vs Testing), Entity-by-entity Disposition table, Migration Strategy (8 ordered steps), Organization-readiness without building organizations, project_members Invite/Accept Lifecycle, Project Ownership + Visibility, Test Suite Ownership + Visibility, users/profiles Identity Split

### Community 67 - "Backend Auth HTTP DTO"
Cohesion: 0.11
Nodes (15): FromProfile(), Profile, BindAndValidate(), Context, Context, ProfileRepository, Service, NewAuthHandler() (+7 more)

### Community 68 - "supabaseClient.ts"
Cohesion: 0.22
Nodes (6): createMockUserRepository(), userRepositoryAdapter, userRepositoryAdapter, UserRepository, User, UserRole

### Community 69 - "Backend HTTP Response Helpers"
Cohesion: 0.38
Nodes (6): Context, DB, TestRole, NewTestRoleRepository(), toDomainTestRole(), TestRoleRepository

### Community 70 - "Frontend Lint Config"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 71 - "Architecture & Design Review Docs"
Cohesion: 0.22
Nodes (10): Domain Model - Test Management Workflow, Database Schema (Supabase/Postgres), Entity Code Auto-Generate mechanism (next_entity_code), Test Management Workflow design rationale, Testing Domain (unchanged), Decision: Full history instead of last-result, Design Review - Test Management v2, E08 - Test Management v2 (+2 more)

### Community 72 - "PrimeReact UI Convention"
Cohesion: 0.09
Nodes (9): dashboardRepositoryAdapter, createMockDashboardRepository(), dashboardRepositoryAdapter, ContinueWorkingItem, DashboardCounts, DashboardRepository, MyWorkIssue, TestPlanRepository (+1 more)

### Community 73 - "Backend Issue DB Model (MySQL)"
Cohesion: 0.06
Nodes (55): contextKey, mockTokenRepo, Session, FromContext(), Context, Load(), LoadFromToken(), Context (+47 more)

### Community 74 - "Backend Test Case DB Model (MySQL)"
Cohesion: 0.09
Nodes (22): createDataSourceResolver(), DataSourceName, issueRepositoryAdapter, createMockTestCaseRepository(), createMockTestCaseStepRepository(), createMockTestPlanRepository(), projectMemberRepositoryAdapter, issueRepositoryAdapter (+14 more)

### Community 75 - "Backend Test Run DB Model (MySQL)"
Cohesion: 0.30
Nodes (5): Context, TestPlan, NewTestPlanService(), TestPlanService, TestPlanRepository

### Community 76 - "Backend User/Profile DB Model (MySQL)"
Cohesion: 0.15
Nodes (25): T, TestAPITokenIdentityJSONRoundtrip(), TestIssueJSONRoundtrip(), TestIssueStatusConstants(), TestIssueTypeConstants(), TestModuleJSONRoundtrip(), TestPageResultEmpty(), TestPageResultWithIssues() (+17 more)

### Community 77 - "Backend Issue DB Model (Postgres)"
Cohesion: 0.13
Nodes (15): TestPlanStatus, TestPlan, TestTestPlanServiceCreateAddRemoveApprove(), CreateTestPlanInput, IssueRepository, ModuleRepository, ProjectRepository, TagRepository (+7 more)

### Community 78 - "Backend Test Case DB Model (Postgres)"
Cohesion: 0.19
Nodes (10): Context, TestCase, TestPlan, CreateTestCaseInput, TestCaseFilter, UpdateTestCaseInput, TestCasePriority, TestCaseStatus (+2 more)

### Community 79 - "Backend Test Run DB Model (Postgres)"
Cohesion: 0.21
Nodes (20): T, TestResult, TestRole, TestIssueServicePassthrough(), TestModuleServicePassthrough(), TestProjectServiceGet(), TestProjectServiceList(), TestProjectServiceListPropagatesError() (+12 more)

### Community 80 - "Backend User/Profile DB Model (Postgres)"
Cohesion: 0.15
Nodes (6): IssueEditorProps, createMockTagRepository(), tagRepositoryAdapter, tagRepositoryAdapter, TagRepository, Tag

### Community 81 - "Public Docs TS Config"
Cohesion: 0.25
Nodes (7): exclude, extends, include, **/*, astro/tsconfigs/strict, .astro/types.d.ts, dist

### Community 82 - "CSV Import & Test Suite Rationale"
Cohesion: 0.40
Nodes (6): CSV Import instead of xlsx dependency, Test Suite Library, Import CSV, RBAC Field (E17), E17 - Test Case Template Library, Import CSV, RBAC Field, Modules & Tags Feature, Test Cases Feature, Test Suite Library Feature (E17)

### Community 83 - "Backend Test Plan DB Model (MySQL)"
Cohesion: 0.26
Nodes (9): fromDomainIssue(), Context, DB, Issue, Status, NewIssueRepository(), toDomainIssue(), toDomainIssues() (+1 more)

### Community 84 - "Backend Test Plan DB Model (Postgres)"
Cohesion: 0.22
Nodes (8): Context, DB, Project, Time, NewProjectRepo(), main(), ProjectRepo, projectRow

### Community 85 - "Backend Test Case Snapshot Model (MySQL)"
Cohesion: 0.21
Nodes (12): fromDomainTestCase(), Context, DB, Query, TestCase, TestCaseStep, NewTestCaseRepository(), toDomainTestCase() (+4 more)

### Community 86 - "Backend Test Case Snapshot Model (Postgres)"
Cohesion: 0.17
Nodes (10): Context, DB, TestPlan, Time, NewTestPlanRepo(), newUUID(), TestPlanStatus, testPlanCaseRow (+2 more)

### Community 87 - "Backend Auth Repository Ports"
Cohesion: 0.50
Nodes (3): ProfileRepository, ProjectMemberRepository, RefreshTokenRepository

### Community 88 - "Backend Attachment DB Model (MySQL)"
Cohesion: 0.27
Nodes (11): Time, Priority, CreateInput, GithubLink, Issue, Link, Priority, Status (+3 more)

### Community 89 - "Backend Module DB Model (MySQL)"
Cohesion: 0.20
Nodes (14): cleanSteps(), dedupe(), Context, Priority, Query, Repository, Status, TestCase (+6 more)

### Community 90 - "Backend Project DB Model (MySQL)"
Cohesion: 0.09
Nodes (38): ParsedTestCaseRow, useTestPlanDetail(), TestRunWithSummary, useTestRuns(), AddCaseToPlanDialog(), AddCaseToPlanDialogProps, PRIORITY_OPTIONS, StartTestRunDialog() (+30 more)

### Community 91 - "Backend Tag DB Model (MySQL)"
Cohesion: 0.19
Nodes (19): T, TestIssueRowToDomain(), TestIssueRowToDomainNilPointers(), TestModuleRowToDomain(), TestProjectRowToDomain(), TestProjectRowToDomainAllStatuses(), TestProjectRowToDomainVisibility(), TestTagRowToDomain() (+11 more)

### Community 92 - "Backend Test Role DB Model (MySQL)"
Cohesion: 0.17
Nodes (9): Context, DB, TestResult, TestRun, Time, NewTestRunRepo(), testResultRow, TestRunRepo (+1 more)

### Community 93 - "Backend Project Member Repository (MySQL)"
Cohesion: 0.13
Nodes (10): activityRepository, createMockProjectMemberRepository(), dashboardRepository, ProjectMemberRepository, projectMemberRepository, tagRepository, ProjectMember, ProjectMemberInvitation (+2 more)

### Community 94 - "Backend Attachment DB Model (Postgres)"
Cohesion: 0.16
Nodes (9): createMockTestRunRepository(), sampleRun, TestRunSeed, testRunRepositoryAdapter, testRunRepositoryAdapter, TestRunRepository, TestRunWithPlan, testRunRepository (+1 more)

### Community 95 - "Backend Module DB Model (Postgres)"
Cohesion: 0.16
Nodes (6): createMockNotificationRepository(), notificationRepositoryAdapter, notificationRepositoryAdapter, NotificationRepository, notificationRepository, Notification

### Community 96 - "Backend Project DB Model (Postgres)"
Cohesion: 0.21
Nodes (9): Context, DB, Issue, IssueStatus, Time, NewIssueRepo(), IssueRepo, issueRow (+1 more)

### Community 97 - "Backend Tag DB Model (Postgres)"
Cohesion: 0.32
Nodes (6): Context, DB, TestCase, TestCaseStep, NewTestCaseRepo(), TestCaseRepo

### Community 98 - "Backend Test Role DB Model (Postgres)"
Cohesion: 0.12
Nodes (16): 0. Prasyarat: `DATABASE_URL`, Cara menjalankan backend Go (mcp-server & rest-api), Deploy ke VPS (garis besar), Env var per mode, Jalankan server, Konek dari MCP client sungguhan (Claude Desktop / Claude Code) — mode stdio, Membuat token dulu (belum ada UI untuk ini), Menjalankan MCP Server — dua mode, pilih sesuai kebutuhan (+8 more)

### Community 100 - "ResultStep"
Cohesion: 0.14
Nodes (17): isDuplicateKeyErr(), Context, DB, Tag, NewTagRepository(), toDomainTag(), fromDomainTestCase(), Context (+9 more)

### Community 105 - "Backend Logger"
Cohesion: 0.18
Nodes (9): UsernamePickerProps, member(), profile(), AuthContextValue, createMockProfileRepository(), profileRepositoryAdapter, profileRepositoryAdapter, ProfileRepository (+1 more)

### Community 116 - "MentionTextarea.tsx"
Cohesion: 0.26
Nodes (6): activityRepositoryAdapter, createMockActivityRepository(), activityRepositoryAdapter, ActivityRepository, ActivityEntityType, ActivityEntry

### Community 123 - "frontend/scripts/generate-icons.mjs"
Cohesion: 0.15
Nodes (12): buf, dirEntries, __dirname, header, icoSizes, imageBuffers, maskableOffset, pngBuffers (+4 more)

### Community 124 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, scope, short_name (+2 more)

### Community 125 - "dashboardRepository.ts"
Cohesion: 0.13
Nodes (9): IssueFormData, createMockIssueRepository(), IssueRepository, ExternalLink, Issue, IssuePriority, IssueStatus, IssueType (+1 more)

### Community 126 - "TestCaseSnapshotRepository"
Cohesion: 0.39
Nodes (6): Context, DB, NewTestCaseSnapshotRepository(), NewTestPlanCaseReader(), TestCaseSnapshotRepository, TestPlanCaseReader

### Community 127 - "RequireAuth"
Cohesion: 0.20
Nodes (5): createMockModuleRepository(), moduleRepositoryAdapter, moduleRepositoryAdapter, ModuleRepository, moduleRepository

### Community 128 - "frontend/package.json"
Cohesion: 0.22
Nodes (9): scripts, build, build-push, dev, lint, preview, test, test:coverage (+1 more)

### Community 129 - "auditLogRepository.ts"
Cohesion: 0.26
Nodes (7): auditLogRepositoryAdapter, createMockAuditLogRepository(), auditLogRepositoryAdapter, auditLogRepository, AuditLogEntry, AuditLogRepository, auditLogService

### Community 130 - "opencode.json"
Cohesion: 0.50
Nodes (3): plugin, $schema, .opencode/plugins/graphify.js

### Community 132 - "ProjectMemberRepository"
Cohesion: 0.83
Nodes (3): DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 133 - "primeicons"
Cohesion: 0.12
Nodes (16): Backend Go — Task Breakdown (siap eksekusi per-agen), Fase 1 — Database Prasyarat, Fase 3 — MCP Read Tools, Fase 5 — Automation, Analysis, Repo Tools, Fase 7 — REST API, Fase 8 — AI Gateway (defer), T1.1 — Migration `api_tokens`, T1.2 — Migration `mcp_tool_rate_limits` + RPC governance ✅ DONE (+8 more)

### Community 134 - "primereact"
Cohesion: 0.23
Nodes (8): Duration, Profile, HashRefreshToken(), NewRefreshToken(), NewService(), Claims, Service, RegisteredClaims

### Community 136 - "TestCaseSnapshotRepository"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 137 - "Created"
Cohesion: 0.27
Nodes (7): Error, Kind, As(), HTTPErrorHandler(), httpMessage(), statusFor(), HTTPError

### Community 138 - "TestCaseSnapshotRepository"
Cohesion: 0.21
Nodes (6): createMockTestRoleRepository(), testRoleRepositoryAdapter, testRoleRepositoryAdapter, TestRoleRepository, testRoleRepository, TestRole

### Community 139 - "primereact"
Cohesion: 0.24
Nodes (13): decodeCodeCursor(), decodeCreatedAtCursor(), encodeCodeCursor(), encodeCreatedAtCursor(), Time, T, TestDecodeCodeCursorEmptyIsOK(), TestDecodeCodeCursorInvalid() (+5 more)

### Community 140 - "@supabase/supabase-js"
Cohesion: 0.20
Nodes (10): IssueStatus, Issue, IssueStatus, Issue, IssueStatus, CreateIssueInput, IssueFilter, IssueType (+2 more)

### Community 141 - "@tanstack/react-query"
Cohesion: 0.22
Nodes (7): Context, ProjectHandler, Context, Project, NewProjectService(), ProjectRepository, ProjectService

### Community 142 - "ProjectMemberRepository"
Cohesion: 0.47
Nodes (4): Context, DB, NewProjectMemberRepository(), ProjectMemberRepository

### Community 143 - "test-plans/components/dialogs/DuplicateTestPlanDialog.tsx"
Cohesion: 0.18
Nodes (12): Context, Module, Project, Tag, TestCase, TestTestCaseServiceUpdateDuplicateArchive(), ProjectFilter, ProjectStatus (+4 more)

### Community 145 - "Recover"
Cohesion: 0.29
Nodes (14): MiddlewareFunc, ProjectMemberRepository, RequireProjectAccess(), RequireProjectDelete(), RequireProjectEdit(), RequireProjectManageIssues(), RequireProjectManageTests(), requireProjectRole() (+6 more)

### Community 146 - "projectDuplicateService.test.ts"
Cohesion: 0.10
Nodes (9): makeTestCase(), nextId(), TestCaseCreateInput, TestCaseRepository, makeTestCase(), makeTestCaseWithDetails(), TestCase, TestPlanCase (+1 more)

### Community 147 - "Backend Go — Validation Spike (bukti arsitektur bekerja)"
Cohesion: 0.15
Nodes (13): Backend Go — Validation Spike (bukti arsitektur bekerja), Definisi "selesai" untuk spike ini, Hasil (2026-08-01), Kenapa `project.list` / `GET /projects` yang dipilih, S1 — Migration `api_tokens` (blocker MCP, prasyarat S2), S2 — MCP: satu tool `testify.project.list`, wiring stdio nyata, S3 — REST: scaffold Echo + satu endpoint `GET /projects`, S4 — Bukti reuse: bandingkan hasil MCP vs REST (+5 more)

### Community 148 - "Backend Go — Feature Backlog"
Cohesion: 0.17
Nodes (12): Backend Go — Feature Backlog, Epic 10 — AI Gateway Integration (opsional, defer), Epic 1 — Fondasi Repository Layer (Read), Epic 2 — MCP Read Tools (testify.*.list/get/search), Epic 3 — MCP Write Tools (testify.*.create/update/...), Epic 4 — Auth & Governance Middleware, Epic 5 — Automation & Analysis Tools, Epic 6 — Database Migrations (tabel baru) (+4 more)

### Community 163 - "react"
Cohesion: 0.25
Nodes (7): UI Architecture - PrimeReact, PrimeReact UI Library Usage, Testify Vision, frontend/index.html entry point, Theme mode switch inline script (dark/light PrimeReact theme), Testify Landing Page, Repo Structure (landing/frontend/backend/supabase/docs)

### Community 166 - "main"
Cohesion: 0.20
Nodes (9): Context, Tag, NewTagService(), TagService, TagRepository, Registry, Services, ToolAdder (+1 more)

### Community 167 - "NewModuleRepo"
Cohesion: 0.27
Nodes (7): Context, DB, Module, Time, NewModuleRepo(), ModuleRepo, moduleRow

### Community 168 - "testcase_repo.go"
Cohesion: 0.24
Nodes (5): tagRow, Time, testCaseRow, testCaseStepRow, testCaseTagRow

### Community 169 - "NewTestRoleRepo"
Cohesion: 0.27
Nodes (7): Context, DB, TestRole, Time, NewTestRoleRepo(), TestRoleRepo, testRoleRow

### Community 170 - "NewTestCaseService"
Cohesion: 0.33
Nodes (5): Context, TestCase, TestCaseRepository, NewTestCaseService(), TestCaseService

### Community 171 - "Backend Go — Roadmap Eksekusi"
Cohesion: 0.18
Nodes (11): Backend Go — Roadmap Eksekusi, Fase 0 — Perbaikan Scaffold (✅ done — 2026-08-01), Fase 1 — Database Prasyarat (P0), Fase 2 — Repository Layer Lengkap (P0), Fase 3 — MCP Read Tools + Wiring Protokol (P0), Fase 4 — MCP Write Tools + Governance Middleware (P1), Fase 5 — Automation, Analysis, Repo Tools (P1/P2), Fase 6 — Requirement Tools + Artifact Storage (P2) (+3 more)

### Community 172 - "IssueService"
Cohesion: 0.31
Nodes (6): Context, Issue, IssueStatus, NewIssueService(), IssueRepository, IssueService

### Community 173 - "main"
Cohesion: 0.22
Nodes (11): authenticateRequest(), governanceInt(), governanceLimit(), governanceWindow(), main(), Context, Module, NewModuleService() (+3 more)

### Community 174 - "NewTagRepo"
Cohesion: 0.33
Nodes (6): Context, DB, tagRow, Tag, NewTagRepo(), TagRepo

### Community 175 - "Backend Architecture — Testify Platform (Go)"
Cohesion: 0.22
Nodes (9): Backend Architecture — Testify Platform (Go), Database, Dependency, Environment variables, Frontend parallel — kenapa service/adapter ini tidak boleh diskip, Overview, Perbandingan dengan MCP server Node (NvlFr-testify), Prinsip (+1 more)

### Community 176 - "RequireAuth"
Cohesion: 0.33
Nodes (8): extractBearerToken(), Context, MiddlewareFunc, Service, RequireAdmin(), RequireApproved(), RequireAuth(), UserIDFromContext()

### Community 177 - "System Architecture - Client-side SPA"
Cohesion: 0.20
Nodes (9): Fleksibilitas Autentikasi, Mode Deployment, Nilai Pembeda, Prinsip Arsitektur, Roadmap, Target Pengguna, Testify Vision, Tujuan Utama (+1 more)

### Community 178 - "mysql/model/issue.go"
Cohesion: 0.29
Nodes (4): Issue, IssueTag, IssueTestResult, Time

### Community 179 - "mysql/model/testcase.go"
Cohesion: 0.29
Nodes (4): TestCase, TestCaseStep, TestCaseTag, Time

### Community 180 - "mysql/model/testrun.go"
Cohesion: 0.32
Nodes (4): TestResult, TestResultStep, TestRun, Time

### Community 181 - "mysql/model/user.go"
Cohesion: 0.32
Nodes (4): Profile, ProjectMember, RefreshToken, Time

### Community 182 - "postgres/model/issue.go"
Cohesion: 0.29
Nodes (4): Issue, IssueTag, IssueTestResult, Time

### Community 183 - "postgres/model/testcase.go"
Cohesion: 0.29
Nodes (4): TestCase, TestCaseStep, TestCaseTag, Time

### Community 184 - "postgres/model/testrun.go"
Cohesion: 0.32
Nodes (4): TestResult, TestResultStep, TestRun, Time

### Community 185 - "postgres/model/user.go"
Cohesion: 0.32
Nodes (4): Profile, ProjectMember, RefreshToken, Time

### Community 186 - ".List"
Cohesion: 0.20
Nodes (12): MCPServer, ToolAdder, governanceInt(), governanceLimit(), governanceWindow(), main(), toolAdder(), Context (+4 more)

### Community 188 - "NewTestRoleService"
Cohesion: 0.39
Nodes (5): Context, TestRole, NewTestRoleService(), TestRoleService, TestRoleRepository

### Community 189 - "Catatan Porting — NvlFr-testify (Node) → backend Go ini"
Cohesion: 0.29
Nodes (6): Aturan utama, Cara pakai referensi Node dengan benar, Catatan Porting — NvlFr-testify (Node) → backend Go ini, Dampak ke dokumen lain, Kenapa ini perlu ditulis eksplisit, Sebelum menulis kode porting apa pun

### Community 190 - "HealthHandler"
Cohesion: 0.38
Nodes (4): Context, DB, HealthHandler, HealthResponse

### Community 191 - "Layer"
Cohesion: 0.33
Nodes (6): `core/` — no framework dependency, Layer, `mcp-server/` — MCP protocol transport, `repository/postgres/` — satu-satunya layer DB, `rest-api/` — HTTP transport (akan datang), `service/` — business logic, satu-satunya consumer dari repository

### Community 192 - "TestPlan"
Cohesion: 0.33
Nodes (3): TestPlan, TestPlanCase, Time

### Community 193 - "TestPlan"
Cohesion: 0.33
Nodes (3): TestPlan, TestPlanCase, Time

### Community 194 - "Fase 2 — Repository Layer"
Cohesion: 0.33
Nodes (6): Fase 2 — Repository Layer, T2.1 — `TestCaseRepo`, T2.2 — `TestPlanRepo`, T2.3 — `TestRunRepo`, T2.4 — `IssueRepo`, T2.5 — Tambah port `Module`, `Tag`, `TestRole`

### Community 198 - "Fase 4 — Write Tools + Governance"
Cohesion: 0.40
Nodes (5): Fase 4 — Write Tools + Governance, T4.1 — File baru `write_tools.go` — ✅ DONE (2026-08-01), T4.2 — Governance middleware (rate-limit + audit) — ✅ DONE, T4.3 — Project-scope recursive guard — ✅ DONE (2026-08-01), T4.4 — Aktifkan write tools di registry — ✅ DONE (2026-08-01)

### Community 199 - "Fase 6 — Requirement Tools + Artifact Storage"
Cohesion: 0.40
Nodes (5): Fase 6 — Requirement Tools + Artifact Storage, T6.1 — Migration `requirements`/`requirement_links`, T6.2 — `RequirementRepo`, T6.3 — 3 requirement tool, T6.4 — `testify.artifact.getUrl`

### Community 210 - "Recover"
Cohesion: 0.50
Nodes (3): Logger, MiddlewareFunc, Recover()

### Community 211 - "health_handler_test.go"
Cohesion: 0.67
Nodes (3): T, TestHealthCheckDBDisconnected(), TestHealthCheckResponseFields()

### Community 240 - "response.go"
Cohesion: 0.50
Nodes (4): Context, OKWithMeta(), envelope, errorBody

### Community 245 - "SupabaseStorageAdapter.ts"
Cohesion: 0.12
Nodes (13): AttachmentPanelProps, entityAttachmentRepositoryAdapter, createMockEntityAttachmentRepository(), entityAttachmentRepositoryAdapter, entityAttachmentRepository, EntityAttachmentRepository, issueRepository, storageAdapter (+5 more)

### Community 246 - "NewTestResultService"
Cohesion: 0.39
Nodes (5): Context, TestResult, NewTestResultService(), TestResultService, TestResultRepository

## Knowledge Gaps
- **455 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `ProjectRepository`, `TestCaseRepository`, `TestPlanRepository` (+450 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Internal()` connect `Backend Issue Domain & Service` to `Test Run Repository (MySQL+Postgres)`, `Created`, `Frontend Routes & Pages`, `Backend Profile Repository`, `ProjectMemberRepository`, `Backend Test Plan Repository (MySQL)`, `Backend Issue Repository (Postgres)`, `Backend Google OAuth Service`, `Backend Project Repository (MySQL)`, `Backend Project Repository (Postgres)`, `Backend Module Repository (MySQL)`, `Backend JWT & Auth Service`, `Backend Test Role Repository (MySQL)`, `Backend Attachment Repository (MySQL)`, `Backend Attachment Repository (Postgres)`, `Backend Refresh Token Repository (MySQL)`, `Backend Refresh Token Repository (Postgres)`, `Backend HTTP Response Helpers`, `Recover`, `Backend Test Plan DB Model (MySQL)`, `Backend Test Case Snapshot Model (MySQL)`, `ResultStep`, `TestCaseSnapshotRepository`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Validation()` connect `Backend Test Run Service` to `Backend Module DB Model (MySQL)`, `Backend Test Plan Service`, `Backend Auth HTTP DTO`, `Created`, `Backend Test Role HTTP DTO`, `Backend Project Service`, `Backend Issue HTTP Layer`, `Backend Test Plan HTTP Layer`, `Backend Project HTTP Layer`, `Backend Module Service`, `Backend Auth HTTP Handler`, `Backend Issue Repository (MySQL)`, `Backend Test Run HTTP Layer`, `Backend Attachment Service`, `Backend Tag Service`, `Backend Test Role Service`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `main()` connect `.List` to `Test Case Backend (Domain+Service+Repo)`, `@tanstack/react-query`, `main`, `NewModuleRepo`, `NewTestRoleRepo`, `NewTestCaseService`, `IssueService`, `main`, `NewTagRepo`, `Backend Tag Repository (Postgres)`, `NewTestRoleService`, `Backend Issue DB Model (MySQL)`, `Backend Test Run DB Model (MySQL)`, `Backend Test Plan DB Model (Postgres)`, `Backend Test Case Snapshot Model (Postgres)`, `Backend Test Role DB Model (MySQL)`, `Backend Project DB Model (Postgres)`, `Backend Tag DB Model (Postgres)`, `NewTestResultService`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Are the 160 inferred relationships involving `Internal()` (e.g. with `.issueTokenPair()` and `toDomainIssues()`) actually correct?**
  _`Internal()` has 160 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `writeReg()` (e.g. with `NewIssueService()` and `NewTestCaseService()`) actually correct?**
  _`writeReg()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `ProjectRepository` to the rest of the system?**
  _455 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Test Run Repository (MySQL+Postgres)` be split into smaller, more focused modules?**
  _Cohesion score 0.09929078014184398 - nodes in this community are weakly interconnected._