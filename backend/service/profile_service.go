package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// ProfileService resolves profile UUIDs to their public display identity so
// tool responses can carry human-readable names instead of bare UUIDs.
type ProfileService struct {
	repo core.ProfileRepository
}

func NewProfileService(repo core.ProfileRepository) *ProfileService {
	return &ProfileService{repo: repo}
}

func (s *ProfileService) GetMany(ctx context.Context, ids []string) (map[string]core.Profile, error) {
	return s.repo.GetMany(ctx, ids)
}
