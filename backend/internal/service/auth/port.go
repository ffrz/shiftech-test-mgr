package auth

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/project"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
)

// ProfileRepository is the persistence port the auth service depends on for
// profiles. Implemented separately per driver (repository/mysql,
// repository/postgres) — the service never imports gorm or a driver package.
type ProfileRepository interface {
	FindByID(ctx context.Context, id string) (*user.Profile, error)
	FindByEmail(ctx context.Context, email string) (*user.Profile, error)
	Create(ctx context.Context, p *user.Profile) error
	Update(ctx context.Context, p *user.Profile) error
}

// RefreshTokenRepository persists refresh tokens so they can be revoked
// server-side (see plan §5 — this is what makes admin-forced logout possible
// despite access tokens being stateless).
type RefreshTokenRepository interface {
	Create(ctx context.Context, t *user.RefreshToken) error
	FindByHash(ctx context.Context, tokenHash string) (*user.RefreshToken, error)
	RevokeAllForUser(ctx context.Context, userID string) error
	Revoke(ctx context.Context, id string) error
}

// ProjectMemberRepository is used by RBAC checks (CanEditProject, etc. in
// policy.go) to resolve a user's role within a specific project.
type ProjectMemberRepository interface {
	FindByProjectAndUser(ctx context.Context, projectID, userID string) (*project.Member, error)
}
