package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// AttachmentRepo reads entity_attachments metadata (polymorphic across
// issue/test_case/test_plan/test_run). Read-only — file bytes live in storage
// and are never selected through the MCP server.
type AttachmentRepo struct {
	db *gorm.DB
}

func NewAttachmentRepo(db *gorm.DB) *AttachmentRepo {
	return &AttachmentRepo{db: db}
}

func (r *AttachmentRepo) ListForEntity(ctx context.Context, projectID, entityType, entityID string) ([]core.AttachmentInfo, error) {
	var rows []attachmentRow
	if err := r.db.WithContext(ctx).
		Where("project_id = ? AND entity_type = ? AND entity_id = ?", projectID, entityType, entityID).
		Order("created_at DESC, id DESC").
		Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("attachment list: %w", err)
	}

	out := make([]core.AttachmentInfo, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

type attachmentRow struct {
	ID          string    `gorm:"column:id"`
	FileName    string    `gorm:"column:file_name"`
	URL         string    `gorm:"column:url"`
	ContentType *string   `gorm:"column:content_type"`
	FileSize    *int      `gorm:"column:file_size"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (attachmentRow) TableName() string { return "entity_attachments" }

func (r attachmentRow) toDomain() core.AttachmentInfo {
	return core.AttachmentInfo{
		ID:          r.ID,
		FileName:    r.FileName,
		URL:         r.URL,
		ContentType: r.ContentType,
		FileSize:    r.FileSize,
		CreatedAt:   r.CreatedAt,
	}
}
