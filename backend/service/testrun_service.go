package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// TestRunService wraps core.TestRunRepository. Business rules for TestRun
// (e.g. Complete must be a manual, explicit action; summary is always
// computed on-the-fly rather than stored) belong here.
type TestRunService struct {
	repo core.TestRunRepository
}

func NewTestRunService(repo core.TestRunRepository) *TestRunService {
	return &TestRunService{repo: repo}
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
