package tag

import "time"

// Tag is a free-form per-project label — no updated_at (insert/rename/delete
// only, never bulk-updated in place, matching the migration schema).
type Tag struct {
	ID        string
	ProjectID string
	Name      string
	CreatedAt time.Time
}
