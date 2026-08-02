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
