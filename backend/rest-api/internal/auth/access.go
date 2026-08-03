package auth

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// Role mirrors project_members.role (CLAUDE.md §Domain Model — ProjectMember).
type Role string

const (
	RoleManager    Role = "manager"
	RoleSupervisor Role = "supervisor"
	RoleTester     Role = "tester"
	RoleMember     Role = "member"
)

// projectMemberRow maps the columns of project_members this package needs.
// Deliberately plain GORM (no jsonb, no Raw SQL, no Postgres array types) so
// it runs unchanged against Postgres in production and SQLite in tests —
// see docs/ROADMAP_V3.md R3 for why this repo is written this way instead of
// reusing repository/postgres's Raw-SQL-heavy style.
type projectMemberRow struct {
	ProjectID string `gorm:"column:project_id"`
	UserID    string `gorm:"column:user_id"`
	Role      string `gorm:"column:role"`
	Status    string `gorm:"column:status"`
}

func (projectMemberRow) TableName() string { return "project_members" }

// AccessRepository resolves a user's project membership, mirroring the
// has_project_access()/can_edit_project_content()/is_project_manager()
// Postgres RLS helper functions (supabase/migrations/20260725000004_...,
// 20260725000009_...). Those functions rely on auth.uid(), which is only
// populated when a request goes through PostgREST — this Go REST API
// connects to Postgres directly via DATABASE_URL, so RLS does not apply and
// this repository re-implements the same "accepted membership" check
// explicitly instead of depending on any SET LOCAL trick.
type AccessRepository struct {
	db *gorm.DB
}

func NewAccessRepository(db *gorm.DB) *AccessRepository {
	return &AccessRepository{db: db}
}

// RoleFor returns the caller's accepted membership role for a project, or
// ("", false) if the user has no accepted membership (not a member, or
// still 'invited'/'declined' — same filter as has_project_access()).
func (r *AccessRepository) RoleFor(ctx context.Context, projectID, userID string) (Role, bool, error) {
	var row projectMemberRow
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND user_id = ? AND status = ?", projectID, userID, "accepted").
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return Role(row.Role), true, nil
}

// HasAccess mirrors has_project_access(): any accepted membership, any role.
func (r *AccessRepository) HasAccess(ctx context.Context, projectID, userID string) (bool, error) {
	_, ok, err := r.RoleFor(ctx, projectID, userID)
	return ok, err
}

// CanEditContent mirrors can_edit_project_content(): manager or supervisor.
func (r *AccessRepository) CanEditContent(ctx context.Context, projectID, userID string) (bool, error) {
	role, ok, err := r.RoleFor(ctx, projectID, userID)
	if err != nil || !ok {
		return false, err
	}
	return role == RoleManager || role == RoleSupervisor, nil
}

// IsManager mirrors is_project_manager(): manager only.
func (r *AccessRepository) IsManager(ctx context.Context, projectID, userID string) (bool, error) {
	role, ok, err := r.RoleFor(ctx, projectID, userID)
	if err != nil || !ok {
		return false, err
	}
	return role == RoleManager, nil
}
