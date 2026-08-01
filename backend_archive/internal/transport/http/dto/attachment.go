package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/attachment"
)

type CreateAttachmentRequest struct {
	StorageProvider string `json:"storage_provider"`
	URL             string `json:"url" validate:"required"`
	FileName        string `json:"file_name" validate:"required,max=500"`
	FileSize        *int   `json:"file_size"`
	ContentType     string `json:"content_type"`
}

type AttachmentResponse struct {
	ID              string    `json:"id"`
	IssueID         string    `json:"issue_id"`
	StorageProvider string    `json:"storage_provider"`
	URL             string    `json:"url"`
	FileName        string    `json:"file_name"`
	FileSize        *int      `json:"file_size"`
	ContentType     string    `json:"content_type"`
	CreatedAt       time.Time `json:"created_at"`
}

func FromAttachment(a attachment.Attachment) AttachmentResponse {
	return AttachmentResponse{
		ID:              a.ID,
		IssueID:         a.IssueID,
		StorageProvider: a.StorageProvider,
		URL:             a.URL,
		FileName:        a.FileName,
		FileSize:        a.FileSize,
		ContentType:     a.ContentType,
		CreatedAt:       a.CreatedAt,
	}
}

func FromAttachments(attachments []attachment.Attachment) []AttachmentResponse {
	result := make([]AttachmentResponse, len(attachments))
	for i, a := range attachments {
		result[i] = FromAttachment(a)
	}
	return result
}
