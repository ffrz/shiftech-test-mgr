package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// TestResultService wraps core.TestResultRepository.
type TestResultService struct {
	repo core.TestResultRepository
}

func NewTestResultService(repo core.TestResultRepository) *TestResultService {
	return &TestResultService{repo: repo}
}

func (s *TestResultService) List(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestResultService) Get(ctx context.Context, id string) (*core.TestResult, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestResultService) ListStepsForRun(ctx context.Context, projectID, runID string) ([]core.TestResultStep, error) {
	return s.repo.ListStepsForRun(ctx, projectID, runID)
}

func (s *TestResultService) RecordStep(ctx context.Context, projectID, stepResultID string, input core.RecordStepResultInput) (*core.TestResultStep, error) {
	return s.repo.RecordStep(ctx, projectID, stepResultID, input)
}
