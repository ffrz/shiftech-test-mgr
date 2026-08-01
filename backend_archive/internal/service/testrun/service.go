// Package testrun ports frontend/src/services/testRunService.ts and
// testResultRepository.ts business rules 1:1. Two invariants matter more
// than anything else in this whole domain (see ARCHITECTURE.md section 4.0
// and section 6.3):
//
//  1. Start/StartCustom SNAPSHOT the current Test Case content into
//     test_results at run-creation time (title/objective/preconditions/
//     steps/expected_result/priority + code, all copied as of "right now").
//     Later edits to the source Test Case never retroactively change what an
//     already-started run recorded -- that is the entire point of splitting
//     "template" (TestCase) from "execution history" (TestResult).
//  2. GetWithResults computes pass/fail/skip/blocked/not_run counts and a
//     progress percentage ON THE FLY by counting test_results rows, every
//     single call -- this is NEVER a stored column anywhere. Manual
//     Complete/Reopen is a completely separate, independent action from
//     this calculation.
package testrun

import (
	"context"
	"strings"
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testrun"
)

type Service struct {
	repo         Repository
	testCases    TestCaseRepository
	testPlanCase TestPlanCaseRepository
}

func NewService(repo Repository, testCases TestCaseRepository, testPlanCase TestPlanCaseRepository) *Service {
	return &Service{repo: repo, testCases: testCases, testPlanCase: testPlanCase}
}

func (s *Service) ListByProject(ctx context.Context, projectID string) ([]testrun.TestRun, error) {
	return s.repo.FindAllByProject(ctx, projectID)
}

func (s *Service) ListByPlan(ctx context.Context, testPlanID string) ([]testrun.TestRun, error) {
	return s.repo.FindAllByPlan(ctx, testPlanID)
}

func (s *Service) GetByID(ctx context.Context, id string) (*testrun.TestRun, error) {
	return s.repo.FindByID(ctx, id)
}

// Start snapshots every test case currently in the plan's scope into
// test_results as 'not_run' -- later edits to the plan's case list don't
// retroactively change what this run covers, matching how a real regression
// cycle has a fixed scope from the moment it begins.
func (s *Service) Start(ctx context.Context, projectID, testPlanID, name, code string) (*testrun.TestRun, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("test run name is required", map[string]string{"name": "required"})
	}

	orderedTestCaseIDs, err := s.testPlanCase.FindOrderedTestCaseIDsByPlan(ctx, testPlanID)
	if err != nil {
		return nil, err
	}
	if len(orderedTestCaseIDs) == 0 {
		return nil, apperror.Validation(
			"this test plan has no test cases yet -- add test cases before starting a run",
			map[string]string{"test_plan_id": "empty_scope"},
		)
	}

	planID := testPlanID
	run := &testrun.TestRun{
		ProjectID:  projectID,
		TestPlanID: &planID,
		Name:       name,
		Code:       strings.TrimSpace(code),
		Status:     testrun.StatusInProgress,
		StartedAt:  time.Now(),
	}
	return s.startWithScope(ctx, run, orderedTestCaseIDs)
}

// StartCustom is an unplanned run -- no Test Plan involved, test cases are
// picked directly and TestPlanID stays nil. Order is just the position of
// each id in testCaseIDs.
func (s *Service) StartCustom(ctx context.Context, projectID, name string, testCaseIDs []string, code string) (*testrun.TestRun, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("test run name is required", map[string]string{"name": "required"})
	}
	if len(testCaseIDs) == 0 {
		return nil, apperror.Validation(
			"select at least one test case for this test run",
			map[string]string{"test_case_ids": "required"},
		)
	}

	run := &testrun.TestRun{
		ProjectID:  projectID,
		TestPlanID: nil,
		Name:       name,
		Code:       strings.TrimSpace(code),
		Status:     testrun.StatusInProgress,
		StartedAt:  time.Now(),
	}
	return s.startWithScope(ctx, run, testCaseIDs)
}

// startWithScope is the shared snapshot-seeding path for both Start and
// StartCustom -- see the package doc comment for why this snapshotting is
// the single most important invariant in the whole domain model.
func (s *Service) startWithScope(ctx context.Context, run *testrun.TestRun, orderedTestCaseIDs []string) (*testrun.TestRun, error) {
	snapshots, err := s.testCases.FindByIDs(ctx, orderedTestCaseIDs)
	if err != nil {
		return nil, err
	}
	if len(snapshots) == 0 {
		return nil, apperror.Validation(
			"no test cases could be fetched to start this run -- they may have been deleted",
			map[string]string{"test_case_ids": "not_found"},
		)
	}
	if len(snapshots) != len(orderedTestCaseIDs) {
		return nil, apperror.Validation(
			"only some of the test cases in scope could be fetched -- some may have been deleted",
			map[string]string{"test_case_ids": "partial_not_found"},
		)
	}

	// Preserve the caller's order (plan order, or custom selection order) on
	// the snapshot slice regardless of what order FindByIDs returned rows in.
	orderIndex := make(map[string]int, len(orderedTestCaseIDs))
	for i, id := range orderedTestCaseIDs {
		orderIndex[id] = i
	}
	ordered := make([]TestCaseSnapshot, len(snapshots))
	for _, snap := range snapshots {
		idx, ok := orderIndex[snap.ID]
		if !ok {
			continue
		}
		ordered[idx] = snap
	}

	detailedIDs := make([]string, 0, len(ordered))
	for _, snap := range ordered {
		if snap.StepType == "detailed" {
			detailedIDs = append(detailedIDs, snap.ID)
		}
	}
	var steps []TestCaseStepSnapshot
	if len(detailedIDs) > 0 {
		steps, err = s.testCases.FindStepsByTestCaseIDs(ctx, detailedIDs)
		if err != nil {
			return nil, err
		}
	}

	if err := s.repo.Create(ctx, run); err != nil {
		return nil, err
	}
	if err := s.repo.SeedResults(ctx, run.ID, ordered, steps); err != nil {
		return nil, err
	}
	return run, nil
}

func (s *Service) Rename(ctx context.Context, id, name, code string) (*testrun.TestRun, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, apperror.Validation("test run name is required", map[string]string{"name": "required"})
	}
	code = strings.TrimSpace(code)
	if code == "" {
		return nil, apperror.Validation("test run code is required", map[string]string{"code": "required"})
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Name = name
	existing.Code = code
	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// Complete is always a manual action (per product decision) -- never
// inferred automatically from every result being filled in. Independent of
// GetWithResults' progress calculation.
func (s *Service) Complete(ctx context.Context, id string, notes *string) (*testrun.TestRun, error) {
	return s.repo.UpdateStatus(ctx, id, testrun.StatusCompleted, true, notes)
}

func (s *Service) Reopen(ctx context.Context, id string) (*testrun.TestRun, error) {
	return s.repo.UpdateStatus(ctx, id, testrun.StatusInProgress, false, nil)
}

func (s *Service) Remove(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// WithResults bundles a run's results with a summary computed on the fly --
// see the package doc comment. NEVER cache/store this summary.
type WithResults struct {
	Results []testrun.Result
	Summary testrun.Summary
}

func (s *Service) GetWithResults(ctx context.Context, testRunID string) (*WithResults, error) {
	results, err := s.repo.FindResultsByRun(ctx, testRunID)
	if err != nil {
		return nil, err
	}
	return &WithResults{Results: results, Summary: computeSummary(results)}, nil
}

func computeSummary(results []testrun.Result) testrun.Summary {
	summary := testrun.Summary{Total: len(results)}
	for _, r := range results {
		switch r.Status {
		case testrun.ResultPass:
			summary.Pass++
		case testrun.ResultFail:
			summary.Fail++
		case testrun.ResultSkip:
			summary.Skip++
		case testrun.ResultBlocked:
			summary.Blocked++
		case testrun.ResultNotRun:
			summary.NotRun++
		}
	}
	summary.Executed = summary.Total - summary.NotRun
	if summary.Total > 0 {
		summary.ProgressPercent = int(float64(summary.Executed) / float64(summary.Total) * 100.0)
	}
	return summary
}

// RecordResult updates one test_results row -- sets executed_at to now(),
// matching testResultRepository.recordResult exactly.
func (s *Service) RecordResult(ctx context.Context, testResultID string, status testrun.ResultStatus, testerID *string, notes string) (*testrun.Result, error) {
	switch status {
	case testrun.ResultPass, testrun.ResultFail, testrun.ResultSkip, testrun.ResultBlocked, testrun.ResultNotRun:
	default:
		return nil, apperror.Validation("invalid test result status", map[string]string{"status": "invalid"})
	}
	return s.repo.UpdateResult(ctx, testResultID, status, testerID, notes)
}

// RecordStepResult mirrors RecordResult but for a single step of a
// 'detailed' test case -- a simpler pass/fail than the overall Result.Status.
func (s *Service) RecordStepResult(ctx context.Context, testResultStepID string, status testrun.StepStatus, actualResult string) (*testrun.ResultStep, error) {
	switch status {
	case testrun.StepPass, testrun.StepFail, testrun.StepNotRun:
	default:
		return nil, apperror.Validation("invalid test result step status", map[string]string{"status": "invalid"})
	}
	return s.repo.UpdateResultStep(ctx, testResultStepID, status, actualResult)
}

// SyncResultWithTestCase pulls the current template content back into one
// result's snapshot -- only while the run is still in progress, so a
// completed run's history can never be retroactively changed. Mirrors
// testRunService.syncResultWithTestCase's guard exactly.
func (s *Service) SyncResultWithTestCase(ctx context.Context, testRunID, resultID string) (*testrun.Result, error) {
	run, err := s.repo.FindByID(ctx, testRunID)
	if err != nil {
		return nil, err
	}
	if run.Status == testrun.StatusCompleted {
		return nil, apperror.Validation(
			"this test run is already completed -- reopen it first to sync",
			map[string]string{"status": "completed"},
		)
	}

	result, err := s.repo.FindResultByID(ctx, resultID)
	if err != nil {
		return nil, err
	}
	snaps, err := s.testCases.FindByIDs(ctx, []string{result.TestCaseID})
	if err != nil {
		return nil, err
	}
	if len(snaps) == 0 {
		return nil, apperror.NotFound("source test case not found")
	}

	return s.repo.UpdateResultSnapshot(ctx, result.ID, snaps[0])
}
