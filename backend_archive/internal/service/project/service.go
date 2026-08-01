// Package project ports frontend/src/services/projectService.ts business
// rules 1:1: name is required (trimmed), description trims to empty-as-nil,
// status changes and permanent delete are separate operations from the
// regular update — same shape as the frontend repository/service split.
package project

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, query project.Query) ([]project.Project, error) {
	return s.repo.FindAll(ctx, query)
}

func (s *Service) GetByID(ctx context.Context, id string) (*project.Project, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateInput struct {
	Name        string
	Description string
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*project.Project, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("project name is required", map[string]string{"name": "required"})
	}
	p := &project.Project{
		Name:        name,
		Description: strings.TrimSpace(input.Description),
		Status:      project.StatusActive,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

type UpdateInput struct {
	Name        string
	Description string
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*project.Project, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("project name is required", map[string]string{"name": "required"})
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Name = name
	existing.Description = strings.TrimSpace(input.Description)
	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

// ChangeStatus is a distinct action from Update (see ARCHITECTURE.md §6.5 —
// status lifecycle goes through a row action menu, not the regular edit
// form, same split kept here).
func (s *Service) ChangeStatus(ctx context.Context, id string, status project.Status) (*project.Project, error) {
	switch status {
	case project.StatusActive, project.StatusInactive, project.StatusArchived:
	default:
		return nil, apperror.Validation("invalid project status", map[string]string{"status": "invalid"})
	}
	return s.repo.UpdateStatus(ctx, id, status)
}

// DeletePermanently relies on DB-level ON DELETE CASCADE (see migrations)
// to remove all child rows — no soft-delete, no restore, matching the
// frontend's explicit product decision (ARCHITECTURE.md §6.5).
func (s *Service) DeletePermanently(ctx context.Context, id string) error {
	return s.repo.DeletePermanently(ctx, id)
}
