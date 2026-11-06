package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/shiftech/testify-platform/core"
)

// ModuleService wraps core.ModuleRepository.
type ModuleService struct {
	repo core.ModuleRepository
}

func NewModuleService(repo core.ModuleRepository) *ModuleService {
	return &ModuleService{repo: repo}
}

func (s *ModuleService) ListByProject(ctx context.Context, projectID string) ([]core.Module, error) {
	return s.repo.ListByProject(ctx, projectID)
}

func (s *ModuleService) Get(ctx context.Context, id string) (*core.Module, error) {
	return s.repo.Get(ctx, id)
}

func (s *ModuleService) Create(ctx context.Context, projectID, name string, code *string) (*core.Module, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("module name cannot be empty")
	}
	if code != nil {
		trimmed := strings.TrimSpace(*code)
		if trimmed == "" {
			code = nil
		} else {
			code = &trimmed
		}
	}
	return s.repo.Create(ctx, projectID, name, code)
}

func (s *ModuleService) Update(ctx context.Context, id, name, code string) (*core.Module, error) {
	name, code = strings.TrimSpace(name), strings.TrimSpace(code)
	if name == "" || code == "" {
		return nil, fmt.Errorf("module name and code cannot be empty")
	}
	return s.repo.Update(ctx, id, name, code)
}

func (s *ModuleService) Delete(ctx context.Context, id string) error { return s.repo.Delete(ctx, id) }
