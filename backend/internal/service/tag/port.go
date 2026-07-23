package tag

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/tag"
)

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string) ([]tag.Tag, error)
	// FindOrCreate does a case-insensitive lookup by name within the project
	// before inserting — matches tagRepository.ts's ilike-then-insert pattern,
	// the core operation reused when tagging test cases/issues.
	FindOrCreate(ctx context.Context, projectID, name string) (*tag.Tag, error)
	Update(ctx context.Context, id, name string) (*tag.Tag, error)
	Delete(ctx context.Context, id string) error
}
