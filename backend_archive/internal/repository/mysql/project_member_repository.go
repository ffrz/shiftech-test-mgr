package mysql

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
	"github.com/shiftech/testmgr-backend/internal/repository/mysql/model"
)

type ProjectMemberRepository struct {
	db *gorm.DB
}

func NewProjectMemberRepository(db *gorm.DB) *ProjectMemberRepository {
	return &ProjectMemberRepository{db: db}
}

func (r *ProjectMemberRepository) FindByProjectAndUser(ctx context.Context, projectID, userID string) (*project.Member, error) {
	var m model.ProjectMember
	err := r.db.WithContext(ctx).
		First(&m, "project_id = ? AND user_id = ?", projectID, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("project membership not found")
		}
		return nil, apperror.Internal(err)
	}
	return &project.Member{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		UserID:    m.UserID,
		Role:      project.MemberRole(m.Role),
	}, nil
}
