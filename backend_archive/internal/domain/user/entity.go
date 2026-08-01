// Package user holds the Profile and RefreshToken domain entities plus the
// repository interfaces the auth service depends on. Pure Go structs — no
// GORM tags here (those live in the repository/{mysql,postgres}/model
// packages), so the service layer never imports gorm.
package user

import "time"

type Role string

const (
	RolePending Role = "pending"
	RoleUser    Role = "user"
	RoleAdmin   Role = "admin"
)

// Profile mirrors the frontend's Profile domain type (1:1 with an
// authenticated identity — previously Supabase auth.users, now created
// directly by the Go auth service on first Google login).
type Profile struct {
	ID        string
	Email     string
	FullName  string
	AvatarURL string
	Role      Role
	DeletedAt *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (p Profile) IsApproved() bool {
	return p.DeletedAt == nil && (p.Role == RoleUser || p.Role == RoleAdmin)
}

func (p Profile) IsAdmin() bool {
	return p.DeletedAt == nil && p.Role == RoleAdmin
}

// RefreshToken is the DB-backed half of the auth scheme (see plan §5): access
// tokens are stateless JWTs, but refresh tokens are persisted so an admin
// action (suspend/revoke) can force logout before natural expiry. Only the
// hash is stored, never the raw token.
type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

func (r RefreshToken) IsValid(now time.Time) bool {
	return r.RevokedAt == nil && now.Before(r.ExpiresAt)
}
