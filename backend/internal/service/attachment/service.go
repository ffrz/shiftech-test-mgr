// Package attachment is intentionally the thinnest module in this task --
// it persists file metadata only (url/file_name/file_size/content_type),
// assuming the URL already exists by the time a request reaches here. Real
// upload/storage-adapter integration is explicitly out of scope (see task
// constraints), matching the instruction to cut scope here first if
// anything has to give.
package attachment

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/attachment"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) ListByIssue(ctx context.Context, issueID string) ([]attachment.Attachment, error) {
	return s.repo.FindByIssueID(ctx, issueID)
}

type CreateInput struct {
	IssueID         string
	StorageProvider string
	URL             string
	FileName        string
	FileSize        *int
	ContentType     string
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*attachment.Attachment, error) {
	url := strings.TrimSpace(input.URL)
	if url == "" {
		return nil, apperror.Validation("attachment url is required", map[string]string{"url": "required"})
	}
	fileName := strings.TrimSpace(input.FileName)
	if fileName == "" {
		return nil, apperror.Validation("attachment file name is required", map[string]string{"file_name": "required"})
	}
	provider := strings.TrimSpace(input.StorageProvider)
	if provider == "" {
		provider = "internal"
	}

	a := &attachment.Attachment{
		IssueID:         input.IssueID,
		StorageProvider: provider,
		URL:             url,
		FileName:        fileName,
		FileSize:        input.FileSize,
		ContentType:     strings.TrimSpace(input.ContentType),
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Service) Remove(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
