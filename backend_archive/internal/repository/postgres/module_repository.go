package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/module"
	"github.com/shiftech/testmgr-backend/internal/repository/entitycode"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

const moduleCodePrefix = "MOD"

type ModuleRepository struct {
	db *gorm.DB
}

func NewModuleRepository(db *gorm.DB) *ModuleRepository {
	return &ModuleRepository{db: db}
}

func (r *ModuleRepository) FindAllByProject(ctx context.Context, projectID string) ([]module.Module, error) {
	var rows []model.Module
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("code").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]module.Module, len(rows))
	for i, row := range rows {
		result[i] = *toDomainModule(row)
	}
	return result, nil
}

func (r *ModuleRepository) FindByID(ctx context.Context, id string) (*module.Module, error) {
	var m model.Module
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("module not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainModule(m), nil
}

func (r *ModuleRepository) Create(ctx context.Context, mod *module.Module) error {
	if mod.ID == "" {
		mod.ID = uuid.NewString()
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if mod.Code == "" {
			code, err := entitycode.Next(ctx, tx, mod.ProjectID, moduleCodePrefix)
			if err != nil {
				return apperror.Internal(err)
			}
			mod.Code = code
		}
		m := fromDomainModule(mod)
		if err := tx.Create(&m).Error; err != nil {
			if isDuplicateKeyErr(err) {
				return apperror.Conflict("a module with this name or code already exists in this project")
			}
			return apperror.Internal(err)
		}
		*mod = *toDomainModule(m)
		return nil
	})
}

func (r *ModuleRepository) Update(ctx context.Context, mod *module.Module) error {
	m := fromDomainModule(mod)
	err := r.db.WithContext(ctx).Model(&model.Module{}).
		Where("id = ?", mod.ID).
		Updates(map[string]any{"name": m.Name, "code": m.Code}).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a module with this name or code already exists in this project")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *ModuleRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.Module{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainModule(m model.Module) *module.Module {
	return &module.Module{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		Code:      m.Code,
		Name:      m.Name,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

func fromDomainModule(m *module.Module) model.Module {
	return model.Module{
		ID:        m.ID,
		ProjectID: m.ProjectID,
		Code:      m.Code,
		Name:      m.Name,
	}
}
