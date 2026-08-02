package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// TestPlanService wraps core.TestPlanRepository. Business rules for TestPlan
// (e.g. approval preconditions, case scope validation) belong here.
type TestPlanService struct {
	repo core.TestPlanRepository
}

func NewTestPlanService(repo core.TestPlanRepository) *TestPlanService {
	return &TestPlanService{repo: repo}
}

func (s *TestPlanService) List(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestPlanService) Get(ctx context.Context, id string) (*core.TestPlan, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestPlanService) Create(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
	return s.repo.Create(ctx, input)
}

func (s *TestPlanService) AddCases(ctx context.Context, planID string, caseIDs []string) error {
	return s.repo.AddCases(ctx, planID, caseIDs)
}

func (s *TestPlanService) RemoveCases(ctx context.Context, planID string, caseIDs []string) error {
	return s.repo.RemoveCases(ctx, planID, caseIDs)
}

func (s *TestPlanService) Approve(ctx context.Context, id string, approverID string) error {
	return s.repo.Approve(ctx, id, approverID)
}
