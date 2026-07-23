package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

type RefreshTokenRepository struct {
	db *gorm.DB
}

func NewRefreshTokenRepository(db *gorm.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, t *user.RefreshToken) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	m := model.RefreshToken{
		ID:        t.ID,
		UserID:    t.UserID,
		TokenHash: t.TokenHash,
		ExpiresAt: t.ExpiresAt,
		RevokedAt: t.RevokedAt,
	}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *RefreshTokenRepository) FindByHash(ctx context.Context, tokenHash string) (*user.RefreshToken, error) {
	var m model.RefreshToken
	if err := r.db.WithContext(ctx).First(&m, "token_hash = ?", tokenHash).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("refresh token not found")
		}
		return nil, apperror.Internal(err)
	}
	return &user.RefreshToken{
		ID:        m.ID,
		UserID:    m.UserID,
		TokenHash: m.TokenHash,
		ExpiresAt: m.ExpiresAt,
		RevokedAt: m.RevokedAt,
		CreatedAt: m.CreatedAt,
	}, nil
}

func (r *RefreshTokenRepository) RevokeAllForUser(ctx context.Context, userID string) error {
	now := time.Now()
	err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("user_id = ? AND revoked_at IS NULL", userID).
		Update("revoked_at", now).Error
	if err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *RefreshTokenRepository) Revoke(ctx context.Context, id string) error {
	now := time.Now()
	err := r.db.WithContext(ctx).Model(&model.RefreshToken{}).
		Where("id = ?", id).
		Update("revoked_at", now).Error
	if err != nil {
		return apperror.Internal(err)
	}
	return nil
}
