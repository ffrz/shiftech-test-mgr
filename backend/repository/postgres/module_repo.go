package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type ModuleRepo struct {
	db *gorm.DB
}

func NewModuleRepo(db *gorm.DB) *ModuleRepo {
	return &ModuleRepo{db: db}
}

func (r *ModuleRepo) ListByProject(ctx context.Context, projectID string) ([]core.Module, error) {
	var rows []moduleRow
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("module list: %w", err)
	}
	items := make([]core.Module, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}
	return items, nil
}

func (r *ModuleRepo) Get(ctx context.Context, id string) (*core.Module, error) {
	var row moduleRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("module get: %w", err)
	}
	m := row.toDomain()
	return &m, nil
}

type moduleRow struct {
	ID        string    `gorm:"column:id"`
	ProjectID string    `gorm:"column:project_id"`
	Code      string    `gorm:"column:code"`
	Name      string    `gorm:"column:name"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (moduleRow) TableName() string { return "modules" }

func (r moduleRow) toDomain() core.Module {
	return core.Module{
		ID:        r.ID,
		Name:      r.Name,
		ProjectID: r.ProjectID,
		CreatedAt: r.CreatedAt,
	}
}
