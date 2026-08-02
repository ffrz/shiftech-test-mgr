package postgres

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/lib/pq"
	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// ---------------------------------------------------------------------------
// TokenRepo — implements core.TokenRepository
// ---------------------------------------------------------------------------

type TokenRepo struct {
	db *gorm.DB
}

func NewTokenRepo(db *gorm.DB) *TokenRepo {
	return &TokenRepo{db: db}
}

func (r *TokenRepo) Authenticate(ctx context.Context, rawToken string) (*core.APITokenIdentity, error) {
	hash := sha256Hex(rawToken)

	var row apiTokenRow
	err := r.db.WithContext(ctx).
		Where("token_hash = ? AND revoked_at IS NULL", hash).
		First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}

	// Re-check the creator's project access on every call, not just at
	// token-creation time — this is what lets removing a user from a
	// project (project_members) or transferring ownership immediately
	// invalidate any token they made for that project, without a separate
	// revoke step. Same access rule as the frontend's RLS
	// has_project_access(): owner OR an accepted project_members row.
	hasAccess, err := r.creatorHasProjectAccess(ctx, row.CreatedBy, row.ProjectID)
	if err != nil {
		return nil, err
	}
	if !hasAccess {
		return nil, ErrProjectAccessRevoked
	}

	return &core.APITokenIdentity{
		TokenID:   row.ID,
		ProjectID: row.ProjectID,
		Scopes:    toScopes(row.Scopes),
		CreatedBy: row.CreatedBy,
	}, nil
}

// creatorHasProjectAccess mirrors the frontend's has_project_access() RLS
// function (supabase/migrations/20260725000004_remove_admin_bypass_project_access.sql):
// the user must own the project or hold an accepted project_members row.
func (r *TokenRepo) creatorHasProjectAccess(ctx context.Context, userID, projectID string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).Raw(`
		select count(*) from projects
		where id = ? and (
			owner_id = ?
			or exists (
				select 1 from project_members
				where project_id = projects.id and user_id = ? and status = 'accepted'
			)
		)
	`, projectID, userID, userID).Scan(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *TokenRepo) ValidateScopes(ctx context.Context, tokenID string, required ...core.TokenScope) error {
	var row apiTokenRow
	if err := r.db.WithContext(ctx).Where("id = ?", tokenID).First(&row).Error; err != nil {
		return err
	}
	have := toScopes(row.Scopes)
	has := make(map[core.TokenScope]bool, len(have))
	for _, s := range have {
		has[s] = true
	}
	for _, need := range required {
		if !has[need] {
			return ErrInsufficientScopes
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

// toScopes converts a Postgres text[] column (pq.StringArray) into typed scopes.
func toScopes(raw pq.StringArray) []core.TokenScope {
	out := make([]core.TokenScope, len(raw))
	for i, s := range raw {
		out[i] = core.TokenScope(s)
	}
	return out
}

type apiTokenRow struct {
	ID        string         `gorm:"column:id"`
	ProjectID string         `gorm:"column:project_id"`
	TokenHash string         `gorm:"column:token_hash"`
	Scopes    pq.StringArray `gorm:"column:scopes;type:text[]"`
	RevokedAt *time.Time     `gorm:"column:revoked_at"`
	CreatedBy string         `gorm:"column:created_by"`
}

func (apiTokenRow) TableName() string { return "api_tokens" }

var (
	ErrInvalidToken         = errors.New("invalid or revoked API token")
	ErrInsufficientScopes   = errors.New("API token lacks required scope")
	ErrProjectAccessRevoked = errors.New("token creator no longer has access to this project")
)
