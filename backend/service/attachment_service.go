package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// AttachmentService reads entity_attachments metadata (polymorphic across
// issue/test_case/test_plan/test_run). Read-only — file bytes stay in storage.
type AttachmentService struct {
	repo core.AttachmentRepository
}

func NewAttachmentService(repo core.AttachmentRepository) *AttachmentService {
	return &AttachmentService{repo: repo}
}

func (s *AttachmentService) ListForEntity(ctx context.Context, projectID, entityType, entityID string) ([]core.AttachmentInfo, error) {
	return s.repo.ListForEntity(ctx, projectID, entityType, entityID)
}
