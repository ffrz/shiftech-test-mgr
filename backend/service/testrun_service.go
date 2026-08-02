package service

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
)

// TestRunService wraps core.TestRunRepository (plus the result repository
// needed for testify.testrun.summary). Business rules for TestRun (e.g.
// Complete must be a manual, explicit action; summary is always computed
// on-the-fly rather than stored) belong here.
type TestRunService struct {
	repo    core.TestRunRepository
	results core.TestResultRepository
}

func NewTestRunService(repo core.TestRunRepository, results core.TestResultRepository) *TestRunService {
	return &TestRunService{repo: repo, results: results}
}

func (s *TestRunService) List(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestRunService) Get(ctx context.Context, id string) (*core.TestRun, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestRunService) Create(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
	return s.repo.Create(ctx, input)
}

func (s *TestRunService) RecordResult(ctx context.Context, resultID string, input core.RecordResultInput) error {
	return s.repo.RecordResult(ctx, resultID, input)
}

func (s *TestRunService) Complete(ctx context.Context, id string) error {
	return s.repo.Complete(ctx, id)
}

func (s *TestRunService) Summary(ctx context.Context, id string) (*core.RunSummary, error) {
	return s.repo.Summary(ctx, id)
}

// GetWithDetail returns a test run plus its on-the-fly summary and the
// individual result rows in a single call — everything testify.testrun.summary
// needs. It enforces the session's project scope.
func (s *TestRunService) GetWithDetail(ctx context.Context, projectID, runID string) (*core.RunDetail, error) {
	run, err := s.repo.Get(ctx, runID)
	if err != nil {
		return nil, err
	}
	if run.ProjectID != projectID {
		return nil, fmt.Errorf("test run not found in the scoped project")
	}

	summary, err := s.repo.Summary(ctx, runID)
	if err != nil {
		return nil, err
	}

	resultPage, err := s.results.List(ctx, core.TestResultFilter{ProjectID: projectID, RunID: &runID, Limit: 100})
	if err != nil {
		return nil, err
	}

	return &core.RunDetail{
		Run:     *run,
		Summary: *summary,
		Results: resultPage.Items,
	}, nil
}
