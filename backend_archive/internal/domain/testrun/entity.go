package testrun

import "time"

type Status string

const (
	StatusInProgress Status = "in_progress"
	StatusCompleted  Status = "completed"
)

// TestRun is one execution session (e.g. "Regression Test 2026-07-25").
// ProjectID is always required and direct; TestPlanID is nullable --
// a "custom"/unplanned run created straight from test cases has no plan.
type TestRun struct {
	ID          string
	ProjectID   string
	TestPlanID  *string
	Code        string
	Name        string
	Status      Status
	StartedAt   time.Time
	CompletedAt *time.Time
	Notes       string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type ResultStatus string

const (
	ResultPass    ResultStatus = "pass"
	ResultFail    ResultStatus = "fail"
	ResultSkip    ResultStatus = "skip"
	ResultBlocked ResultStatus = "blocked"
	ResultNotRun  ResultStatus = "not_run"
)

// Result is one row per (TestRun x TestCase) -- this is where the actual
// pass/fail/skip/blocked/not_run result lives. The TestCase* fields are a
// SNAPSHOT of the test case's content at the moment the run started (see
// service.Start) so history stays accurate even if the source test case is
// edited or archived afterwards -- never a live join.
type Result struct {
	ID                     string
	TestRunID              string
	TestCaseID             string
	TesterID               *string
	Status                 ResultStatus
	ExecutedAt             *time.Time
	Notes                  string
	TestCaseCode           string
	TestCaseTitle          string
	TestCaseObjective      string
	TestCasePreconditions  string
	TestCaseSteps          string
	TestCaseExpectedResult string
	TestCasePriority       string
	// Order snapshots test_plan_cases.order (or the caller-supplied test case
	// index for a custom run) at the moment the run started.
	Order     int
	CreatedAt time.Time
	UpdatedAt time.Time
}

type StepStatus string

const (
	StepPass   StepStatus = "pass"
	StepFail   StepStatus = "fail"
	StepNotRun StepStatus = "not_run"
)

// ResultStep is a per-step result, only meaningful for TestCases whose
// StepType is 'detailed' -- a simpler pass/fail than the overall Result.Status.
type ResultStep struct {
	ID             string
	TestResultID   string
	TestCaseStepID string
	Status         StepStatus
	ActualResult   string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Summary is computed ON THE FLY from Result rows every time it is asked
// for -- it is never a stored column (see ARCHITECTURE.md section 4.0 /
// section 6.3), so a run's progress always reflects the current state of
// test_results with no risk of staleness.
type Summary struct {
	Total           int
	Pass            int
	Fail            int
	Skip            int
	Blocked         int
	NotRun          int
	Executed        int
	ProgressPercent int
}
