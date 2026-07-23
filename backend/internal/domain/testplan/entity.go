package testplan

import "time"

type Status string

const (
	StatusDraft     Status = "draft"
	StatusActive    Status = "active"
	StatusCompleted Status = "completed"
	StatusArchived  Status = "archived"
)

// TestPlan is the scope of test cases relevant for a given release/cycle --
// see ARCHITECTURE.md section 4.0.
type TestPlan struct {
	ID          string
	ProjectID   string
	Code        string
	Name        string
	Description string
	Status      Status
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Case is the test_plan_cases junction row: which Test Case is in scope for
// this plan, plus its display/execution order. It NEVER carries a result
// column -- results always live on test_results (see TestRun/TestResult).
type Case struct {
	ID         string
	TestPlanID string
	TestCaseID string
	Order      int
}
