// Package testrole models a role WITHIN the application under test (e.g.
// Admin/Manager/Member) — a per-project master list referenced by
// test_cases.target_role_id, distinct from user.Role (TestManager's own
// global role) and project.MemberRole (per-project access role).
package testrole

import "time"

type TestRole struct {
	ID        string
	ProjectID string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
}
