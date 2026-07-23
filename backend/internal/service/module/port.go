package module

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/module"
)

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string) ([]module.Module, error)
	FindByID(ctx context.Context, id string) (*module.Module, error)
	Create(ctx context.Context, m *module.Module) error
	Update(ctx context.Context, m *module.Module) error
	Delete(ctx context.Context, id string) error
}
