package postgres

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// ProfileRepo resolves profile UUIDs to their public display identity
// (username/displayName). Email and role live in the private users table and
// are intentionally never selected here — actor resolution for tool responses
// only needs the public identity.
type ProfileRepo struct {
	db *gorm.DB
}

func NewProfileRepo(db *gorm.DB) *ProfileRepo {
	return &ProfileRepo{db: db}
}

func (r *ProfileRepo) GetMany(ctx context.Context, ids []string) (map[string]core.Profile, error) {
	seen := make(map[string]struct{}, len(ids))
	unique := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == "" {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}
	if len(unique) == 0 {
		return map[string]core.Profile{}, nil
	}

	var rows []profileRow
	if err := r.db.WithContext(ctx).Where("id IN ?", unique).Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("profile get many: %w", err)
	}

	out := make(map[string]core.Profile, len(rows))
	for _, row := range rows {
		out[row.ID] = row.toDomain()
	}
	return out, nil
}

type profileRow struct {
	ID          string  `gorm:"column:id"`
	Username    string  `gorm:"column:username"`
	DisplayName *string `gorm:"column:display_name"`
}

func (profileRow) TableName() string { return "profiles" }

func (r profileRow) toDomain() core.Profile {
	return core.Profile{
		ID:          r.ID,
		Username:    r.Username,
		DisplayName: r.DisplayName,
	}
}
