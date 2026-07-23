// Package module ports frontend/src/services/moduleService.ts 1:1: name is
// required (trimmed); code is optional on create (auto-generated MOD-####
// by the repository via entitycode.Next when empty), but required on update
// — matching the frontend's asymmetry between create (code may be omitted
// for the DB trigger to fill in) and update (both fields always sent back).
package module

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/module"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListByProject(ctx context.Context, projectID string) ([]module.Module, error) {
	return s.repo.FindAllByProject(ctx, projectID)
}

type CreateInput struct {
	ProjectID string
	Name      string
	Code      string
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*module.Module, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("module name is required", map[string]string{"name": "required"})
	}
	m := &module.Module{
		ProjectID: input.ProjectID,
		Name:      name,
		Code:      strings.TrimSpace(input.Code),
	}
	if err := s.repo.Create(ctx, m); err != nil {
		return nil, err
	}
	return m, nil
}

type UpdateInput struct {
	Name string
	Code string
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*module.Module, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("module name is required", map[string]string{"name": "required"})
	}
	code := strings.TrimSpace(input.Code)
	if code == "" {
		return nil, apperror.Validation("module code is required", map[string]string{"code": "required"})
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

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
