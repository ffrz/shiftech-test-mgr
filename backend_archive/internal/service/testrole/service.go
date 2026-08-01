// Package testrole ports frontend/src/services/testRoleService.ts 1:1: name
// required (trimmed) on both create and rename.
package testrole

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testrole"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListByProject(ctx context.Context, projectID string) ([]testrole.TestRole, error) {
	return s.repo.FindAllByProject(ctx, projectID)
}

func (s *Service) Create(ctx context.Context, projectID, name string) (*testrole.TestRole, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil, apperror.Validation("test role name is required", map[string]string{"name": "required"})
	}
	r := &testrole.TestRole{ProjectID: projectID, Name: trimmed}
	if err := s.repo.Create(ctx, r); err != nil {
		return nil, err
	}
	return r, nil
}

func (s *Service) Update(ctx context.Context, id, name string) (*testrole.TestRole, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil, apperror.Validation("test role name is required", map[string]string{"name": "required"})
	}
	return s.repo.Update(ctx, id, trimmed)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
