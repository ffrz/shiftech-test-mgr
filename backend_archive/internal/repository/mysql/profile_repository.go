package mysql

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/user"
	"github.com/shiftech/testmgr-backend/internal/repository/mysql/model"
)

type ProfileRepository struct {
	db *gorm.DB
}

func NewProfileRepository(db *gorm.DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

func (r *ProfileRepository) FindByID(ctx context.Context, id string) (*user.Profile, error) {
	var m model.Profile
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("profile not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainProfile(m), nil
}

func (r *ProfileRepository) FindByEmail(ctx context.Context, email string) (*user.Profile, error) {
	var m model.Profile
	if err := r.db.WithContext(ctx).First(&m, "email = ?", email).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("profile not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainProfile(m), nil
}

func (r *ProfileRepository) Create(ctx context.Context, p *user.Profile) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	m := fromDomainProfile(p)
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		return apperror.Internal(err)
	}
	*p = *toDomainProfile(m)
	return nil
}

func (r *ProfileRepository) Update(ctx context.Context, p *user.Profile) error {
	m := fromDomainProfile(p)
	if err := r.db.WithContext(ctx).Model(&model.Profile{}).Where("id = ?", p.ID).Updates(m).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainProfile(m model.Profile) *user.Profile {
	return &user.Profile{
		ID:        m.ID,
		Email:     m.Email,
		FullName:  m.FullName,
		AvatarURL: m.AvatarURL,
		Role:      user.Role(m.Role),
		DeletedAt: m.DeletedAt,
		CreatedAt: m.CreatedAt,
		UpdatedAt: m.UpdatedAt,
	}
}

func fromDomainProfile(p *user.Profile) model.Profile {
	return model.Profile{
		ID:        p.ID,
		Email:     p.Email,
		FullName:  p.FullName,
		AvatarURL: p.AvatarURL,
		Role:      string(p.Role),
		DeletedAt: p.DeletedAt,
	}
}
