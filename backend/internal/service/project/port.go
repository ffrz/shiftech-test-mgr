package project

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/project"
)

type Repository interface {
	FindAll(ctx context.Context, query project.Query) ([]project.Project, error)
	FindByID(ctx context.Context, id string) (*project.Project, error)
	Create(ctx context.Context, p *project.Project) error
	Update(ctx context.Context, p *project.Project) error
	UpdateStatus(ctx context.Context, id string, status project.Status) (*project.Project, error)
	DeletePermanently(ctx context.Context, id string) error
}
