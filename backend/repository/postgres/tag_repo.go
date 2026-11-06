package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TagRepo struct {
	db *gorm.DB
}

func NewTagRepo(db *gorm.DB) *TagRepo {
	return &TagRepo{db: db}
}

func (r *TagRepo) ListByProject(ctx context.Context, projectID string) ([]core.Tag, error) {
	var rows []tagRow
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("tag list: %w", err)
	}
	items := make([]core.Tag, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}
	return items, nil
}

func (r *TagRepo) Get(ctx context.Context, id string) (*core.Tag, error) {
	var row tagRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("tag get: %w", err)
	}
	t := row.toDomain()
	return &t, nil
}

func (r *TagRepo) FindOrCreate(ctx context.Context, projectID, name string) (*core.Tag, error) {
	var row tagRow
	err := r.db.WithContext(ctx).Where("project_id = ? AND lower(name) = lower(?)", projectID, name).Take(&row).Error
	if err == nil {
		item := row.toDomain()
		return &item, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("tag find: %w", err)
	}
	row = tagRow{ID: newUUID(), ProjectID: projectID, Name: name, CreatedAt: time.Now()}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("tag create: %w", err)
	}
	item := row.toDomain()
	return &item, nil
}

func (r *TagRepo) Update(ctx context.Context, id, name string) (*core.Tag, error) {
	if err := r.db.WithContext(ctx).Model(&tagRow{}).Where("id = ?", id).Update("name", name).Error; err != nil {
		return nil, fmt.Errorf("tag update: %w", err)
	}
	return r.Get(ctx, id)
}

func (r *TagRepo) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&tagRow{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("tag delete: %w", err)
	}
	return nil
}

func (r tagRow) toDomain() core.Tag {
	return core.Tag{
		ID:        r.ID,
		Name:      r.Name,
		ProjectID: r.ProjectID,
		CreatedAt: r.CreatedAt,
	}
}
