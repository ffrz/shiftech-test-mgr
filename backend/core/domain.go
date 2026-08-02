package core

import "time"

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

type ProjectStatus string

const (
	ProjectStatusActive   ProjectStatus = "active"
	ProjectStatusInactive ProjectStatus = "inactive"
	ProjectStatusArchived ProjectStatus = "archived"
)

type ProjectVisibility string

const (
	VisibilityPrivate  ProjectVisibility = "private"
	VisibilityUnlisted ProjectVisibility = "unlisted"
	VisibilityPublic   ProjectVisibility = "public"
)

// ProjectOwnerType is a polymorphic-owner placeholder; only "user" exists so
// far (see 20260725000007_project_ownership_and_visibility.sql).
type ProjectOwnerType string

const (
	OwnerTypeUser ProjectOwnerType = "user"
)

type Project struct {
	ID          string            `json:"id"`
	OwnerID     string            `json:"ownerId"`
	OwnerType   ProjectOwnerType  `json:"ownerType"`
	Name        string            `json:"name"`
	Description *string           `json:"description"`
	Status      ProjectStatus     `json:"status"`
	Visibility  ProjectVisibility `json:"visibility"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

type Module struct {
	ID        string    `json:"id"`
	ProjectID string    `json:"projectId"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Case
// ---------------------------------------------------------------------------

type TestCasePriority string

const (
	PriorityLow      TestCasePriority = "low"
	PriorityMedium   TestCasePriority = "medium"
	PriorityHigh     TestCasePriority = "high"
	PriorityCritical TestCasePriority = "critical"
)

type TestCaseStatus string

const (
	TestCaseStatusActive   TestCaseStatus = "active"
	TestCaseStatusArchived TestCaseStatus = "archived"
)

type StepType string

const (
	StepSimple   StepType = "simple"
	StepDetailed StepType = "detailed"
)

// TestCaseStep is one structured row of test_case_steps, only present when the
// parent TestCase.StepType == "detailed".
type TestCaseStep struct {
	ID             string    `json:"id"`
	TestCaseID     string    `json:"testCaseId"`
	StepNumber     int       `json:"stepNumber"`
	Action         string    `json:"action"`
	ExpectedResult *string   `json:"expectedResult"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type ExternalLink struct {
	URL   string `json:"url"`
	Label string `json:"label,omitempty"`
}

// TestCase is a reusable template — it never stores a pass/fail result itself.
// Results live on TestResult, one row per (TestRun x TestCase).
type TestCase struct {
	ID             string           `json:"id"`
	ProjectID      string           `json:"projectId"`
	ModuleID       *string          `json:"moduleId"`
	Code           string           `json:"code"`
	Title          string           `json:"title"`
	Objective      *string          `json:"objective"`
	Preconditions  *string          `json:"preconditions"`
	Steps          string           `json:"steps"`
	ExpectedResult string           `json:"expectedResult"`
	Priority       TestCasePriority `json:"priority"`
	Status         TestCaseStatus   `json:"status"`
	Notes          *string          `json:"notes"`
	StepType       StepType         `json:"stepType"`
	TargetRoleID   *string          `json:"targetRoleId"`
	AssignedTo     *string          `json:"assignedTo"`
	ExternalLinks  []ExternalLink   `json:"externalLinks"`
	CreatedBy      *string          `json:"createdBy"`
	// DetailedSteps carries the structured test_case_steps rows for a
	// step_type="detailed" case. It is populated on full reads (Get) and
	// omitted from list payloads. The "steps" text field above remains the
	// single source blob, matching the frontend TestCase domain type.
	DetailedSteps []TestCaseStep `json:"detailedSteps,omitempty"`
	// Tags are tag names, resolved from the tags table (backend convenience;
	// the frontend resolves them via joins instead).
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Plan
// ---------------------------------------------------------------------------

type TestPlan struct {
	ID          string         `json:"id"`
	Code        string         `json:"code"`
	Name        string         `json:"name"`
	Description *string        `json:"description"`
	Status      TestPlanStatus `json:"status"`
	ProjectID   string         `json:"projectId"`
	CreatedBy   *string        `json:"createdBy"`
	// CaseIDs is the ordered scope of test case IDs for the plan (backend
	// convenience, resolved from test_plan_cases).
	CaseIDs   []string  `json:"caseIds"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Tag struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CreatedAt time.Time `json:"createdAt"`
}

type TestRole struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Run & Test Result
// ---------------------------------------------------------------------------

type TestRunStatus string

const (
	RunInProgress TestRunStatus = "in_progress"
	RunCompleted  TestRunStatus = "completed"
)

type TestResultStatus string

const (
	ResultPass    TestResultStatus = "pass"
	ResultFail    TestResultStatus = "fail"
	ResultSkip    TestResultStatus = "skip"
	ResultBlocked TestResultStatus = "blocked"
	ResultNotRun  TestResultStatus = "not_run"
)

type TestRun struct {
	ID          string        `json:"id"`
	ProjectID   string        `json:"projectId"`
	TestPlanID  *string       `json:"testPlanId"`
	Code        string        `json:"code"`
	Name        string        `json:"name"`
	Status      TestRunStatus `json:"status"`
	StartedAt   time.Time     `json:"startedAt"`
	CompletedAt *time.Time    `json:"completedAt"`
	Notes       *string       `json:"notes"`
	StartedBy   *string       `json:"startedBy"`
	CreatedAt   time.Time     `json:"createdAt"`
	UpdatedAt   time.Time     `json:"updatedAt"`
}

// TestResult is a snapshot of the test case content as it was when the run
// started — the run screen displays this snapshot, never a live join, so a
// completed run's history stays accurate even if the source test case is
// edited or archived afterwards.
type TestResult struct {
	ID                     string           `json:"id"`
	TestRunID              string           `json:"testRunId"`
	TestCaseID             string           `json:"testCaseId"`
	TesterID               *string          `json:"testerId"`
	Status                 TestResultStatus `json:"status"`
	ExecutedAt             *time.Time       `json:"executedAt"`
	Notes                  *string          `json:"notes"`
	TestCaseCode           string           `json:"testCaseCode"`
	TestCaseTitle          string           `json:"testCaseTitle"`
	TestCaseObjective      *string          `json:"testCaseObjective"`
	TestCasePreconditions  *string          `json:"testCasePreconditions"`
	TestCaseSteps          string           `json:"testCaseSteps"`
	TestCaseExpectedResult string           `json:"testCaseExpectedResult"`
	TestCasePriority       TestCasePriority `json:"testCasePriority"`
	TestCaseNotes          *string          `json:"testCaseNotes"`
	// Order is a snapshot of test_plan_cases.order at the moment the run
	// started, so a run's item order always matches the plan's order then.
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type RunSummary struct {
	Pass    int `json:"pass"`
	Fail    int `json:"fail"`
	Skip    int `json:"skip"`
	Blocked int `json:"blocked"`
	NotRun  int `json:"notRun"`
	Total   int `json:"total"`
}

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

type IssueStatus string

const (
	IssueBacklog    IssueStatus = "backlog"
	IssueOpen       IssueStatus = "open"
	IssueInProgress IssueStatus = "in_progress"
	IssueResolved   IssueStatus = "resolved"
	IssueVerified   IssueStatus = "verified"
	IssueClosed     IssueStatus = "closed"
	IssueRejected   IssueStatus = "rejected"
	IssueDuplicate  IssueStatus = "duplicate"
)

type TestPlanStatus string

const (
	PlanDraft     TestPlanStatus = "draft"
	PlanActive    TestPlanStatus = "active"
	PlanCompleted TestPlanStatus = "completed"
	PlanArchived  TestPlanStatus = "archived"
)

type IssueType string

const (
	IssueBug         IssueType = "bug"
	IssueFeature     IssueType = "feature"
	IssueImprovement IssueType = "improvement"
	IssueTask        IssueType = "task"
)

type IssuePriority string

const (
	IssuePriorityLow      IssuePriority = "low"
	IssuePriorityMedium   IssuePriority = "medium"
	IssuePriorityHigh     IssuePriority = "high"
	IssuePriorityCritical IssuePriority = "critical"
)

// Issue is project-level (not a child of exactly one TestResult) — it can
// stand alone (a feature request, a general finding) or be linked to any
// number of TestResults via the issue_test_results junction.
type Issue struct {
	ID             string        `json:"id"`
	Code           string        `json:"code"`
	ProjectID      string        `json:"projectId"`
	ModuleID       *string       `json:"moduleId"`
	Type           IssueType     `json:"type"`
	Title          string        `json:"title"`
	Description    *string       `json:"description"`
	ActualResult   *string       `json:"actualResult"`
	ExpectedResult *string       `json:"expectedResult"`
	Priority       IssuePriority `json:"priority"`
	Status         IssueStatus   `json:"status"`
	AssignedTo     *string       `json:"assignedTo"`
	TargetRoleID   *string       `json:"targetRoleId"`
	ExternalLinks  []ExternalLink `json:"externalLinks"`
	CreatedBy      *string       `json:"createdBy"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// API Token
// ---------------------------------------------------------------------------

type TokenScope string

const (
	ScopeReadProject    TokenScope = "read:project"
	ScopeReadTestCase   TokenScope = "read:test-cases"
	ScopeReadTestPlan   TokenScope = "read:test-plans"
	ScopeReadTestRun    TokenScope = "read:test-runs"
	ScopeReadIssue      TokenScope = "read:issues"
	ScopeReadAutomation TokenScope = "read:automation"
	ScopeWriteTestCase  TokenScope = "write:test-cases"
	ScopeWriteTestPlan  TokenScope = "write:test-plans"
	ScopeWriteTestRun   TokenScope = "write:test-runs"
	ScopeWriteIssue     TokenScope = "write:issues"
	ScopeWriteAutomation TokenScope = "write:automation"
)

type APITokenIdentity struct {
	TokenID   string       `json:"tokenId"`
	ProjectID string       `json:"projectId"`
	Scopes    []TokenScope `json:"scopes"`
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

type PageResult[T any] struct {
	Items      []T    `json:"items"`
	NextCursor string `json:"nextCursor"`
	HasMore    bool   `json:"hasMore"`
	Total      int    `json:"total"`
}
