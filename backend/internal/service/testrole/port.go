package testrole

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/testrole"
)

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string) ([]testrole.TestRole, error)
	FindByID(ctx context.Context, id string) (*testrole.TestRole, error)
	Create(ctx context.Context, r *testrole.TestRole) error
	Update(ctx context.Context, id, name string) (*testrole.TestRole, error)
	Delete(ctx context.Context, id string) error
}
