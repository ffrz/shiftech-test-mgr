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
