package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// ProjectRepo — implements core.ProjectRepository
// ---------------------------------------------------------------------------

type ProjectRepo struct {
	db *gorm.DB
}

func NewProjectRepo(db *gorm.DB) *ProjectRepo {
	return &ProjectRepo{db: db}
}

func (r *ProjectRepo) List(ctx context.Context, filter core.ProjectFilter) ([]core.Project, error) {
	var rows []projectRow
	q := r.db.WithContext(ctx)
	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.OwnerID != nil {
		q = q.Where("owner_id = ?", *filter.OwnerID)
	}
	if filter.Limit > 0 {
		q = q.Limit(filter.Limit).Offset(filter.Offset)
	}
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("project list: %w", err)
	}
	projects := make([]core.Project, len(rows))
	for i, r := range rows {
		projects[i] = r.toDomain()
	}
	return projects, nil
}

func (r *ProjectRepo) Get(ctx context.Context, id string) (*core.Project, error) {
	var row projectRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("project get: %w", err)
	}
	p := row.toDomain()
	return &p, nil
}

// ---------------------------------------------------------------------------
// DB row types (snake_case) → domain mapping
// ---------------------------------------------------------------------------

type projectRow struct {
	ID          string    `gorm:"column:id"`
	Name        string    `gorm:"column:name"`
	Description string    `gorm:"column:description"`
	Status      string    `gorm:"column:status"`
	Visibility  string    `gorm:"column:visibility"`
	OwnerID     string    `gorm:"column:owner_id"`
	OwnerType   string    `gorm:"column:owner_type"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (r projectRow) TableName() string { return "projects" }

func (r projectRow) toDomain() core.Project {
	return core.Project{
		ID:          r.ID,
		Name:        r.Name,
		Description: emptyToNil(r.Description),
		Status:      core.ProjectStatus(r.Status),
		Visibility:  core.ProjectVisibility(r.Visibility),
		OwnerID:     r.OwnerID,
		OwnerType:   core.ProjectOwnerType(r.OwnerType),
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}
