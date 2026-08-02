package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// ProjectService wraps core.ProjectRepository. Business rules for Project
// (ownership checks, visibility transitions, etc.) belong here, not in
// mcp-server/rest-api tool handlers or in repository/postgres.
type ProjectService struct {
	repo core.ProjectRepository
}

func NewProjectService(repo core.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
}

func (s *ProjectService) List(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error) {
	return s.repo.List(ctx, filter)
}

func (s *ProjectService) Get(ctx context.Context, id string) (*core.Project, error) {
	return s.repo.Get(ctx, id)
}
