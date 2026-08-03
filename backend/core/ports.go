package core

import "context"

// ---------------------------------------------------------------------------
// Shared repository interfaces — satu kontrak, banyak implementasi.
// Consumer (MCP / REST) hanya tahu interface ini, tidak tahu Postgres.
// ---------------------------------------------------------------------------

type ProjectRepository interface {
	List(ctx context.Context, filter ProjectFilter) ([]Project, error)
	Get(ctx context.Context, id string) (*Project, error)
}

type TestCaseRepository interface {
	List(ctx context.Context, filter TestCaseFilter) (*PageResult[TestCase], error)
	Get(ctx context.Context, id string) (*TestCase, error)
	Create(ctx context.Context, input CreateTestCaseInput) (*TestCase, error)
	Update(ctx context.Context, id string, input UpdateTestCaseInput) (*TestCase, error)
	Duplicate(ctx context.Context, id string, newTitle string) (*TestCase, error)
	Archive(ctx context.Context, id string) error
}

type TestPlanRepository interface {
	List(ctx context.Context, filter TestPlanFilter) (*PageResult[TestPlan], error)
	Get(ctx context.Context, id string) (*TestPlan, error)
	Create(ctx context.Context, input CreateTestPlanInput) (*TestPlan, error)
	AddCases(ctx context.Context, planID string, caseIDs []string) error
	RemoveCases(ctx context.Context, planID string, caseIDs []string) error
	Approve(ctx context.Context, id string, approverID string) error
}

type TestRunRepository interface {
	List(ctx context.Context, filter TestRunFilter) (*PageResult[TestRun], error)
	Get(ctx context.Context, id string) (*TestRun, error)
	Create(ctx context.Context, input CreateTestRunInput) (*TestRun, error)
	RecordResult(ctx context.Context, resultID string, input RecordResultInput) error
	Complete(ctx context.Context, id string) error
	Summary(ctx context.Context, id string) (*RunSummary, error)
}

type IssueRepository interface {
	List(ctx context.Context, filter IssueFilter) (*PageResult[Issue], error)
	Get(ctx context.Context, id string) (*Issue, error)
	Create(ctx context.Context, input CreateIssueInput) (*Issue, error)
	UpdateStatus(ctx context.Context, id string, status IssueStatus) error
	// Assign sets (or clears, when assignedTo is nil) the issue's assignee.
	Assign(ctx context.Context, id string, assignedTo *string) error
	// GetByCode resolves an issue by its human code (e.g. "ISS-0072") within
	// a project. Returns a not-found error when the code does not exist.
	GetByCode(ctx context.Context, projectID, code string) (*Issue, error)
	// ListLinks returns the issue_test_results rows for one issue with their
	// test-result/run/test-case context, newest execution first.
	ListLinks(ctx context.Context, issueID string) ([]IssueLink, error)
	// ListTagNames returns the tag names attached to an issue.
	ListTagNames(ctx context.Context, issueID string) ([]string, error)
}

// ProfileRepository resolves profile UUIDs to their public display identity.
// This is the single boundary between raw actor UUIDs in the DB and the
// human-readable names tool responses should carry.
type ProfileRepository interface {
	// GetMany resolves a batch of profile UUIDs to their public display
	// identities. Unknown IDs are skipped (not present in the result map).
	GetMany(ctx context.Context, ids []string) (map[string]Profile, error)
}

// ActivityRepository reads and writes the entity_activity timeline (comments
// + system events). Write access is needed for status transitions that must
// leave an audit trail (e.g. issue status change).
type ActivityRepository interface {
	// ListForEntity returns the activity timeline for one entity, newest
	// first, excluding soft-deleted rows.
	ListForEntity(ctx context.Context, projectID, entityType, entityID string, limit int) ([]ActivityEntry, error)
	// Create inserts one activity entry into entity_activity.
	Create(ctx context.Context, input CreateActivityInput) error
}

// AttachmentRepository reads entity_attachments metadata (polymorphic across
// issue/test_case/test_plan/test_run). Read-only — file bytes stay in storage.
type AttachmentRepository interface {
	// ListForEntity returns attachment metadata for one entity, newest first.
	ListForEntity(ctx context.Context, projectID, entityType, entityID string) ([]AttachmentInfo, error)
}

// NotificationRepository creates per-user notifications via the same
// security-definer RPC the frontend calls (create_notification) — see
// supabase/migrations/20260728000001_notifications.sql. Write-only: nothing
// in the MCP/REST surface reads a user's notification inbox today.
type NotificationRepository interface {
	Create(ctx context.Context, input CreateNotificationInput) error
}

type ModuleRepository interface {
	ListByProject(ctx context.Context, projectID string) ([]Module, error)
	Get(ctx context.Context, id string) (*Module, error)
}

type TagRepository interface {
	ListByProject(ctx context.Context, projectID string) ([]Tag, error)
	Get(ctx context.Context, id string) (*Tag, error)
}

type TestRoleRepository interface {
	ListByProject(ctx context.Context, projectID string) ([]TestRole, error)
	Get(ctx context.Context, id string) (*TestRole, error)
}

type TestResultRepository interface {
	List(ctx context.Context, filter TestResultFilter) (*PageResult[TestResult], error)
	Get(ctx context.Context, id string) (*TestResult, error)
}

type TestResultFilter struct {
	ProjectID string
	RunID     *string
	Status    *TestResultStatus
	TesterID  *string
	Cursor    *string
	Limit     int
}

type TokenRepository interface {
	Authenticate(ctx context.Context, token string) (*APITokenIdentity, error)
	ValidateScopes(ctx context.Context, tokenID string, required ...TokenScope) error
}

// AutomationRepository drives the Playwright local-runner orchestration
// tables. Unlike the Node MCP (which called security-definer RPCs), the Go
// server talks to Postgres directly, so these methods are plain queries with
// the runner-token auth kept server-side.
type AutomationRepository interface {
	MapScript(ctx context.Context, input MapScriptInput) (*AutomationScript, error)
	Enqueue(ctx context.Context, input AutomationEnqueueInput) (*AutomationEnqueueResult, error)
	RerunFailed(ctx context.Context, input RerunFailedInput) (*RerunFailedResult, error)
	JobStatus(ctx context.Context, projectID, jobID string) (*AutomationJob, error)
	RunnerList(ctx context.Context, projectID string) ([]AutomationRunner, error)
}

// AnalysisRepository derives on-demand metrics from test_results. Nothing is
// ever cached (TASKS.md T5.3 / ROADMAP.md Fase 5).
type AnalysisRepository interface {
	RunSummary(ctx context.Context, projectID, testRunID string) (*AnalysisRunSummary, error)
	FlakyCandidates(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]FlakyCandidate, error)
	SuggestRetest(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]RetestSuggestion, error)
}

// RepoRepository reads the scoped configuration of a project repository,
// including its decrypted Vault credential. The git operations (clone/fetch,
// ls-files, grep, diff) are performed by the service layer against a local
// checkout — this interface only touches the database.
type RepoRepository interface {
	GetConfig(ctx context.Context, projectID, repositoryID string) (*ProjectRepositoryConfig, error)
}

// ---------------------------------------------------------------------------
// Filter & input types — setiap repository punya versinya sendiri
// ---------------------------------------------------------------------------

type ProjectFilter struct {
	Status  *ProjectStatus
	OwnerID *string
	Limit   int
	Offset  int
}

type TestCaseFilter struct {
	ProjectID string
	ModuleID  *string
	Module    *string // case-insensitive exact module name or code
	Tag       *string // case-insensitive exact tag name
	Priority  *TestCasePriority
	Status    *TestCaseStatus
	StepType  *StepType
	Search    *string
	Cursor    *string
	Limit     int
}

type CreateTestCaseInput struct {
	ProjectID      string
	Title          string
	ModuleID       *string
	Objective      *string
	Preconditions  *string
	Steps          string
	ExpectedResult *string
	Priority       TestCasePriority
	Status         TestCaseStatus
	StepType       StepType
	Notes          *string
	TargetRoleID   *string
	AssignedTo     *string
	ExternalLinks  []ExternalLink
	Tags           []string
}

type UpdateTestCaseInput struct {
	Title          *string
	Objective      *string
	Preconditions  *string
	Steps          *string
	ExpectedResult *string
	Priority       *TestCasePriority
	ModuleID       *string
	StepType       *StepType
	Notes          *string
	TargetRoleID   *string
	AssignedTo     *string
	Tags           *[]string
}

type TestPlanFilter struct {
	ProjectID string
	Status    *TestPlanStatus
	Search    *string
	Cursor    *string
	Limit     int
}

type CreateTestPlanInput struct {
	ProjectID   string
	Name        string
	Description *string
	Status      TestPlanStatus
	CreatedBy   *string
}

type TestRunFilter struct {
	ProjectID string
	Status    *TestRunStatus
	PlanID    *string
	TesterID  *string
	Cursor    *string
	Limit     int
}

type CreateTestRunInput struct {
	ProjectID  string
	Name       string
	TestPlanID *string
	StartedBy  *string
	CaseIDs    []string // for unplanned runs
}

type RecordResultInput struct {
	Status   TestResultStatus
	TesterID string
	Notes    *string
}

type IssueFilter struct {
	ProjectID  string
	Type       *IssueType
	Status     *IssueStatus
	Priority   *IssuePriority
	AssigneeID *string
	RunID      *string
	CaseID     *string
	Search     *string
	Cursor     *string
	Limit      int
}

type CreateIssueInput struct {
	ProjectID      string
	TestResultID   string
	Title          string
	Description    *string
	Type           IssueType
	Priority       IssuePriority
	ModuleID       *string
	ActualResult   *string
	ExpectedResult *string
	TargetRoleID   *string
	AssignedTo     *string
	ExternalLinks  []ExternalLink
}

type MapScriptInput struct {
	ProjectID    string
	TestCaseID   string
	ScriptRef    string
	RunnerLabels []string
	CreatedBy    string
}

// AutomationEnqueueInput targets exactly one of TestCaseID or TestPlanID.
type AutomationEnqueueInput struct {
	ProjectID    string
	TestCaseID   *string
	TestPlanID   *string
	Name         string
	RunnerLabels []string
	MaxAttempts  int
	CreatedBy    string
}

type RerunFailedInput struct {
	ProjectID            string
	IssueID              string
	Name                 string
	RunnerLabels         []string
	MaxAttempts          int
	SelectionLimit       int
	ConfirmedBy          *string
	ExplicitConfirmation bool
	CreatedBy            string
}
