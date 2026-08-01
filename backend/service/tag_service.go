package service

import (
	"context"

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
