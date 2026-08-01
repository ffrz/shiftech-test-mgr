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

type Project struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Status      ProjectStatus     `json:"status"`
	Visibility  ProjectVisibility `json:"visibility"`
	OwnerID     string            `json:"ownerId"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

type Module struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	ProjectID string    `json:"projectId"`
	CreatedAt time.Time `json:"createdAt"`
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

type TestCaseStep struct {
	ID          string `json:"id"`
	TestCasedID string `json:"testCaseId"`
	Order       int    `json:"order"`
	Action      string `json:"action"`
	Expectation string `json:"expectation"`
}

type TestCase struct {
	ID          string            `json:"id"`
	Code        string            `json:"code"`
	Title       string            `json:"title"`
	Objective   string            `json:"objective"`
	Precondition string           `json:"precondition"`
	Steps       []TestCaseStep    `json:"steps"`
	ExpectedResult string         `json:"expectedResult"`
	Priority    TestCasePriority  `json:"priority"`
	Status      TestCaseStatus    `json:"status"`
	StepType    StepType          `json:"stepType"`
	ModuleID    string            `json:"moduleId"`
	ProjectID   string            `json:"projectId"`
	Tags        []string          `json:"tags"`
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   time.Time         `json:"updatedAt"`
}

// ---------------------------------------------------------------------------
// Test Plan
// ---------------------------------------------------------------------------

type TestPlan struct {
	ID          string    `json:"id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ProjectID   string    `json:"projectId"`
	CaseIDs     []string  `json:"caseIds"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
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
	Code        string        `json:"code"`
	Name        string        `json:"name"`
	Status      TestRunStatus `json:"status"`
	PlanID      *string       `json:"planId"`
	ProjectID   string        `json:"projectId"`
	StartedAt   time.Time     `json:"startedAt"`
	CompletedAt *time.Time    `json:"completedAt"`
}

type TestResult struct {
	ID          string           `json:"id"`
	RunID       string           `json:"runId"`
	CaseID      string           `json:"caseId"`
	Status      TestResultStatus `json:"status"`
	TesterID    *string          `json:"testerId"`
	Notes       *string          `json:"notes"`
	UpdatedAt   time.Time        `json:"updatedAt"`
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
	IssueOpen     IssueStatus = "open"
	IssueInProgress IssueStatus = "in_progress"
	IssueResolved IssueStatus = "resolved"
	IssueClosed   IssueStatus = "closed"
)

type IssueType string

const (
	IssueBug         IssueType = "bug"
	IssueFeature     IssueType = "feature"
	IssueImprovement IssueType = "improvement"
	IssueTask        IssueType = "task"
)

type Issue struct {
	ID           string      `json:"id"`
	Code         string      `json:"code"`
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	Type         IssueType   `json:"type"`
	Status       IssueStatus `json:"status"`
	Priority     TestCasePriority `json:"priority"`
	ModuleID     *string     `json:"moduleId"`
	ProjectID    string      `json:"projectId"`
	AssigneeID   *string     `json:"assigneeId"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
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
