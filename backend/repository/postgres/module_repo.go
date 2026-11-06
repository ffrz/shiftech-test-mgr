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

func (r *ModuleRepo) Create(ctx context.Context, projectID, name string, code *string) (*core.Module, error) {
	row := moduleRow{ID: newUUID(), ProjectID: projectID, Name: name, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if code != nil {
		row.Code = *code
	}
	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("module create: %w", err)
	}
	if err := r.db.WithContext(ctx).Where("id = ?", row.ID).First(&row).Error; err != nil {
		return nil, fmt.Errorf("module create fetch: %w", err)
	}
	item := row.toDomain()
	return &item, nil
}

func (r *ModuleRepo) Update(ctx context.Context, id, name, code string) (*core.Module, error) {
	if err := r.db.WithContext(ctx).Model(&moduleRow{}).Where("id = ?", id).Updates(map[string]any{
		"name": name, "code": code, "updated_at": time.Now(),
	}).Error; err != nil {
		return nil, fmt.Errorf("module update: %w", err)
	}
	return r.Get(ctx, id)
}

func (r *ModuleRepo) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&moduleRow{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("module delete: %w", err)
	}
	return nil
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
		ProjectID: r.ProjectID,
		Code:      r.Code,
		Name:      r.Name,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
