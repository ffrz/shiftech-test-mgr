package service

import (
	"context"

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
