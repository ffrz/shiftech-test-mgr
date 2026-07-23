package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

var sortColumn = map[project.SortField]string{
	project.SortByName:      "name",
	project.SortByCreatedAt: "created_at",
	project.SortByUpdatedAt: "updated_at",
}

type ProjectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) FindAll(ctx context.Context, query project.Query) ([]project.Project, error) {
	tx := r.db.WithContext(ctx).Model(&model.Project{})

	if query.Search != "" {
		tx = tx.Where("name ILIKE ?", "%"+query.Search+"%")
	}
	if query.Status != "" {
		tx = tx.Where("status = ?", string(query.Status))
	}

	column, ok := sortColumn[query.SortField]
	if !ok {
		column = sortColumn[project.SortByName]
	}
	direction := "ASC"
	if query.SortDirection == project.SortDesc {
		direction = "DESC"
	}
	tx = tx.Order(column + " " + direction)

	var rows []model.Project
	if err := tx.Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}

	result := make([]project.Project, len(rows))
	for i, row := range rows {
		result[i] = *toDomainProject(row)
	}
	return result, nil
}

func (r *ProjectRepository) FindByID(ctx context.Context, id string) (*project.Project, error) {
	var m model.Project
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("project not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainProject(m), nil
}

func (r *ProjectRepository) Create(ctx context.Context, p *project.Project) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	m := fromDomainProject(p)
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a project with this name already exists")
		}
		return apperror.Internal(err)
	}
	*p = *toDomainProject(m)
	return nil
}

func (r *ProjectRepository) Update(ctx context.Context, p *project.Project) error {
	m := fromDomainProject(p)
	err := r.db.WithContext(ctx).Model(&model.Project{}).
		Where("id = ?", p.ID).
		Updates(map[string]any{"name": m.Name, "description": m.Description}).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a project with this name already exists")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *ProjectRepository) UpdateStatus(ctx context.Context, id string, status project.Status) (*project.Project, error) {
	err := r.db.WithContext(ctx).Model(&model.Project{}).
		Where("id = ?", id).
		Update("status", string(status)).Error
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindByID(ctx, id)
}

func (r *ProjectRepository) DeletePermanently(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.Project{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainProject(m model.Project) *project.Project {
	return &project.Project{
		ID:          m.ID,
		Name:        m.Name,
		Description: m.Description,
		Status:      project.Status(m.Status),
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func fromDomainProject(p *project.Project) model.Project {
	return model.Project{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Status:      string(p.Status),
	}
}
