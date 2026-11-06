package service

import (
	"context"
	"fmt"
	"strings"

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

func (s *TestRoleService) Create(ctx context.Context, projectID, name string) (*core.TestRole, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("test role name cannot be empty")
	}
	return s.repo.Create(ctx, projectID, name)
}

func (s *TestRoleService) Update(ctx context.Context, id, name string) (*core.TestRole, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("test role name cannot be empty")
	}
	return s.repo.Update(ctx, id, name)
}

func (s *TestRoleService) Delete(ctx context.Context, id string) error { return s.repo.Delete(ctx, id) }
