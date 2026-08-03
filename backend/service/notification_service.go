package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// NotificationService creates per-user notifications. Thin on purpose — the
// only rule is "who gets notified for what", which callers (IssueService,
// etc.) decide; this just forwards to the repository.
type NotificationService struct {
	repo core.NotificationRepository
}

func NewNotificationService(repo core.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) Create(ctx context.Context, input core.CreateNotificationInput) error {
	return s.repo.Create(ctx, input)
}
