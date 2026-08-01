package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/tag"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

type TagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) *TagRepository {
	return &TagRepository{db: db}
}

func (r *TagRepository) FindAllByProject(ctx context.Context, projectID string) ([]tag.Tag, error) {
	var rows []model.Tag
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]tag.Tag, len(rows))
	for i, row := range rows {
		result[i] = *toDomainTag(row)
	}
	return result, nil
}

func (r *TagRepository) FindOrCreate(ctx context.Context, projectID, name string) (*tag.Tag, error) {
	var existing model.Tag
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND name ILIKE ?", projectID, name).
		First(&existing).Error
	if err == nil {
		return toDomainTag(existing), nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, apperror.Internal(err)
	}

	m := model.Tag{ID: uuid.NewString(), ProjectID: projectID, Name: name}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		if isDuplicateKeyErr(err) {
			return r.FindOrCreate(ctx, projectID, name)
		}
		return nil, apperror.Internal(err)
	}
	return toDomainTag(m), nil
}

func (r *TagRepository) Update(ctx context.Context, id, name string) (*tag.Tag, error) {
	err := r.db.WithContext(ctx).Model(&model.Tag{}).Where("id = ?", id).Update("name", name).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return nil, apperror.Conflict("a tag with this name already exists in this project")
		}
		return nil, apperror.Internal(err)
	}
	var m model.Tag
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("tag not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainTag(m), nil
}

func (r *TagRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.Tag{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainTag(m model.Tag) *tag.Tag {
	return &tag.Tag{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		Name:      m.Name,
		CreatedAt: m.CreatedAt,
	}
}
