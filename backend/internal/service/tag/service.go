// Package tag ports frontend/src/services/tagService.ts 1:1: there is no
// plain "insert a blank tag" operation — Create is always find-or-create by
// name (matching the on-the-fly tag creation UX from the Test Case/Issue
// forms), Rename and Remove are the only other mutations, exactly as the
// frontend's Tags management tab exposes (ARCHITECTURE.md §6.4).
package tag

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/tag"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListByProject(ctx context.Context, projectID string) ([]tag.Tag, error) {
	return s.repo.FindAllByProject(ctx, projectID)
}

func (s *Service) Create(ctx context.Context, projectID, name string) (*tag.Tag, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil, apperror.Validation("tag name is required", map[string]string{"name": "required"})
	}
	return s.repo.FindOrCreate(ctx, projectID, trimmed)
}

func (s *Service) Rename(ctx context.Context, id, name string) (*tag.Tag, error) {
	trimmed := strings.TrimSpace(name)
	if trimmed == "" {
		return nil, apperror.Validation("tag name is required", map[string]string{"name": "required"})
	}
	return s.repo.Update(ctx, id, trimmed)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
