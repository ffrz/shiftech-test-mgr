package module

import "time"

// Module is the master module list for a project — one per project.TestCase
// and issue.Issue both reference it by nullable FK.
type Module struct {
	ID        string
	ProjectID string
	Code      string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
