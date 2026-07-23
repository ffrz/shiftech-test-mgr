package attachment

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/attachment"
)

// Repository persists Attachment metadata rows only -- actual file
// upload/storage integration (StorageAdapter) is out of scope for this
// module (see task constraints); callers already have a URL by the time
// they reach this port.
type Repository interface {
	FindByIssueID(ctx context.Context, issueID string) ([]attachment.Attachment, error)
	Create(ctx context.Context, a *attachment.Attachment) error
	Delete(ctx context.Context, id string) error
}
