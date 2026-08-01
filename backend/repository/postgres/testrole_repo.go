package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TestRoleRepo struct {
	db *gorm.DB
}

func NewTestRoleRepo(db *gorm.DB) *TestRoleRepo {
	return &TestRoleRepo{db: db}
}

func (r *TestRoleRepo) ListByProject(ctx context.Context, projectID string) ([]core.TestRole, error) {
	var rows []testRoleRow
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testrole list: %w", err)
	}
	items := make([]core.TestRole, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}
	return items, nil
}

func (r *TestRoleRepo) Get(ctx context.Context, id string) (*core.TestRole, error) {
	var row testRoleRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testrole get: %w", err)
	}
	tr := row.toDomain()
	return &tr, nil
}

type testRoleRow struct {
	ID        string    `gorm:"column:id"`
	ProjectID string    `gorm:"column:project_id"`
	Name      string    `gorm:"column:name"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}

func (testRoleRow) TableName() string { return "test_roles" }

func (r testRoleRow) toDomain() core.TestRole {
	return core.TestRole{
		ID:        r.ID,
		Name:      r.Name,
		ProjectID: r.ProjectID,
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
