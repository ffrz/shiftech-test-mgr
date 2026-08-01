package testrun

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/testrun"
)

// TestCaseSnapshot is the minimal current-content view of a Test Case needed
// to seed a test_results row -- fetched via TestCaseRepository so this
// package never depends on the (separately-owned) testcase service/domain.
type TestCaseSnapshot struct {
	ID             string
	Code           string
	Title          string
	Objective      string
	Preconditions  string
	Steps          string
	ExpectedResult string
	Priority       string
	StepType       string // "simple" | "detailed" -- only "detailed" cases get seeded ResultSteps
}

type TestCaseStepSnapshot struct {
	ID         string
	TestCaseID string
}

// TestCaseRepository is a narrow read-only port into the test_cases /
// test_case_steps tables, owned by a different module -- this package only
// ever reads through it, never writes, and never imports the testcase
// domain/service packages (see task constraints).
type TestCaseRepository interface {
	FindByIDs(ctx context.Context, ids []string) ([]TestCaseSnapshot, error)
	FindStepsByTestCaseIDs(ctx context.Context, testCaseIDs []string) ([]TestCaseStepSnapshot, error)
}

// TestPlanCaseRepository is a narrow read-only port into test_plan_cases,
// used only by Start to resolve a plan's current scope.
type TestPlanCaseRepository interface {
	FindOrderedTestCaseIDsByPlan(ctx context.Context, testPlanID string) ([]string, error)
}

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string) ([]testrun.TestRun, error)
	FindAllByPlan(ctx context.Context, testPlanID string) ([]testrun.TestRun, error)
	FindByID(ctx context.Context, id string) (*testrun.TestRun, error)
	Create(ctx context.Context, r *testrun.TestRun) error
	Update(ctx context.Context, r *testrun.TestRun) error
	UpdateStatus(ctx context.Context, id string, status testrun.Status, completedAt bool, notes *string) (*testrun.TestRun, error)
	Delete(ctx context.Context, id string) error

	// SeedResults inserts one Result row per given snapshot (already ordered)
	// plus one ResultStep row per template step of any 'detailed' test case
	// among them -- see Service.Start / Service.StartCustom.
	SeedResults(ctx context.Context, testRunID string, snapshots []TestCaseSnapshot, steps []TestCaseStepSnapshot) error

	FindResultsByRun(ctx context.Context, testRunID string) ([]testrun.Result, error)
	FindResultByID(ctx context.Context, id string) (*testrun.Result, error)
	UpdateResult(ctx context.Context, id string, status testrun.ResultStatus, testerID *string, notes string) (*testrun.Result, error)
	// UpdateResultSnapshot overwrites the test_case_* snapshot columns only,
	// leaving status/tester/notes/executed_at untouched -- backs
	// Service.SyncResultWithTestCase (an explicit, separate action from
	// RecordResult, see testResultRepository.syncWithTestCase).
	UpdateResultSnapshot(ctx context.Context, id string, snapshot TestCaseSnapshot) (*testrun.Result, error)

	FindResultStepByID(ctx context.Context, id string) (*testrun.ResultStep, error)
	UpdateResultStep(ctx context.Context, id string, status testrun.StepStatus, actualResult string) (*testrun.ResultStep, error)
}
