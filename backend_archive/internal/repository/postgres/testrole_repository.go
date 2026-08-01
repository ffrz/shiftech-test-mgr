package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testrole"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

type TestRoleRepository struct {
	db *gorm.DB
}

func NewTestRoleRepository(db *gorm.DB) *TestRoleRepository {
	return &TestRoleRepository{db: db}
}

func (r *TestRoleRepository) FindAllByProject(ctx context.Context, projectID string) ([]testrole.TestRole, error) {
	var rows []model.TestRole
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testrole.TestRole, len(rows))
	for i, row := range rows {
		result[i] = *toDomainTestRole(row)
	}
	return result, nil
}

func (r *TestRoleRepository) FindByID(ctx context.Context, id string) (*testrole.TestRole, error) {
	var m model.TestRole
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test role not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainTestRole(m), nil
}

func (r *TestRoleRepository) Create(ctx context.Context, tr *testrole.TestRole) error {
	if tr.ID == "" {
		tr.ID = uuid.NewString()
	}
	m := model.TestRole{ID: tr.ID, ProjectID: tr.ProjectID, Name: tr.Name}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a test role with this name already exists in this project")
		}
		return apperror.Internal(err)
	}
	*tr = *toDomainTestRole(m)
	return nil
}

func (r *TestRoleRepository) Update(ctx context.Context, id, name string) (*testrole.TestRole, error) {
	err := r.db.WithContext(ctx).Model(&model.TestRole{}).Where("id = ?", id).Update("name", name).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return nil, apperror.Conflict("a test role with this name already exists in this project")
		}
		return nil, apperror.Internal(err)
	}
	return r.FindByID(ctx, id)
}

func (r *TestRoleRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.TestRole{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainTestRole(m model.TestRole) *testrole.TestRole {
	return &testrole.TestRole{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		Name:      m.Name,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}
