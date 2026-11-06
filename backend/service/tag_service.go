package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/shiftech/testify-platform/core"
)

// TagService wraps core.TagRepository.
type TagService struct {
	repo core.TagRepository
}

func NewTagService(repo core.TagRepository) *TagService {
	return &TagService{repo: repo}
}

func (s *TagService) ListByProject(ctx context.Context, projectID string) ([]core.Tag, error) {
	return s.repo.ListByProject(ctx, projectID)
}

func (s *TagService) Get(ctx context.Context, id string) (*core.Tag, error) {
	return s.repo.Get(ctx, id)
}

func (s *TagService) Create(ctx context.Context, projectID, name string) (*core.Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("tag name cannot be empty")
	}
	return s.repo.FindOrCreate(ctx, projectID, name)
}

func (s *TagService) Update(ctx context.Context, id, name string) (*core.Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("tag name cannot be empty")
	}
	return s.repo.Update(ctx, id, name)
}

func (s *TagService) Delete(ctx context.Context, id string) error { return s.repo.Delete(ctx, id) }
