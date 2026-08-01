package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// TestCaseService wraps core.TestCaseRepository. Business rules for TestCase
// (e.g. status transitions, tag/module validation) belong here.
type TestCaseService struct {
	repo core.TestCaseRepository
}

func NewTestCaseService(repo core.TestCaseRepository) *TestCaseService {
	return &TestCaseService{repo: repo}
}

func (s *TestCaseService) List(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestCaseService) Get(ctx context.Context, id string) (*core.TestCase, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestCaseService) Create(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
	return s.repo.Create(ctx, input)
}

func (s *TestCaseService) Update(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
	return s.repo.Update(ctx, id, input)
}

func (s *TestCaseService) Duplicate(ctx context.Context, id string, newTitle string) (*core.TestCase, error) {
	return s.repo.Duplicate(ctx, id, newTitle)
}

func (s *TestCaseService) Archive(ctx context.Context, id string) error {
	return s.repo.Archive(ctx, id)
}
