package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// ActivityService reads the entity_activity timeline (comments + system
// events) for an entity. Read-only.
type ActivityService struct {
	repo core.ActivityRepository
}

func NewActivityService(repo core.ActivityRepository) *ActivityService {
	return &ActivityService{repo: repo}
}

func (s *ActivityService) ListForEntity(ctx context.Context, projectID, entityType, entityID string, limit int) ([]core.ActivityEntry, error) {
	return s.repo.ListForEntity(ctx, projectID, entityType, entityID, limit)
}
