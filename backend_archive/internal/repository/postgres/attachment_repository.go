package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/attachment"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

type AttachmentRepository struct {
	db *gorm.DB
}

func NewAttachmentRepository(db *gorm.DB) *AttachmentRepository {
	return &AttachmentRepository{db: db}
}

func (r *AttachmentRepository) FindByIssueID(ctx context.Context, issueID string) ([]attachment.Attachment, error) {
	var rows []model.Attachment
	if err := r.db.WithContext(ctx).Where("issue_id = ?", issueID).Order("created_at ASC").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]attachment.Attachment, len(rows))
	for i, row := range rows {
		result[i] = toDomainAttachment(row)
	}
	return result, nil
}

func (r *AttachmentRepository) Create(ctx context.Context, a *attachment.Attachment) error {
	if a.ID == "" {
		a.ID = uuid.NewString()
	}
	m := fromDomainAttachment(a)
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return apperror.Internal(err)
	}
	*a = toDomainAttachment(m)
	return nil
}

func (r *AttachmentRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.Attachment{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainAttachment(m model.Attachment) attachment.Attachment {
	return attachment.Attachment{
		ID:              m.ID,
		IssueID:         m.IssueID,
		StorageProvider: m.StorageProvider,
		URL:             m.URL,
		FileName:        m.FileName,
		FileSize:        m.FileSize,
		ContentType:     m.ContentType,
		CreatedAt:       m.CreatedAt,
	}
}

func fromDomainAttachment(a *attachment.Attachment) model.Attachment {
	return model.Attachment{
		ID:              a.ID,
		IssueID:         a.IssueID,
		StorageProvider: a.StorageProvider,
		URL:             a.URL,
		FileName:        a.FileName,
		FileSize:        a.FileSize,
		ContentType:     a.ContentType,
	}
}
