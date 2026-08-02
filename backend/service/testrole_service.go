package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// TestRoleService wraps core.TestRoleRepository.
type TestRoleService struct {
	repo core.TestRoleRepository
}

func NewTestRoleService(repo core.TestRoleRepository) *TestRoleService {
	return &TestRoleService{repo: repo}
}

func (s *TestRoleService) ListByProject(ctx context.Context, projectID string) ([]core.TestRole, error) {
	return s.repo.ListByProject(ctx, projectID)
}

func (s *TestRoleService) Get(ctx context.Context, id string) (*core.TestRole, error) {
	return s.repo.Get(ctx, id)
}
