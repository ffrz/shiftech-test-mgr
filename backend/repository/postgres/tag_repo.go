package postgres

import (
	"context"
	"fmt"

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

func (r tagRow) toDomain() core.Tag {
	return core.Tag{
		ID:        r.ID,
		Name:      r.Name,
		ProjectID: r.ProjectID,
		CreatedAt: r.CreatedAt,
	}
}
