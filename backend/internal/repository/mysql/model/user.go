// Package model holds GORM structs for the MySQL dialect. These are
// intentionally separate from internal/domain entities — column tags differ
// slightly by dialect (see repository/postgres/model), and the service
// layer must never import gorm, so mapping between GORM model <-> domain
// entity happens only inside the repository implementation files.
package model

import "time"

func (Profile) TableName() string       { return "profiles" }
func (RefreshToken) TableName() string  { return "refresh_tokens" }
func (ProjectMember) TableName() string { return "project_members" }

type Profile struct {
	ID        string     `gorm:"column:id;type:char(36);primaryKey"`
	Email     string     `gorm:"column:email;type:varchar(255);not null"`
	FullName  string     `gorm:"column:full_name;type:varchar(255)"`
	AvatarURL string     `gorm:"column:avatar_url;type:text"`
	Role      string     `gorm:"column:role;type:varchar(20);not null"`
	DeletedAt *time.Time `gorm:"column:deleted_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
}

type RefreshToken struct {
	ID        string     `gorm:"column:id;type:char(36);primaryKey"`
	UserID    string     `gorm:"column:user_id;type:char(36);not null"`
	TokenHash string     `gorm:"column:token_hash;type:varchar(255);not null"`
	ExpiresAt time.Time  `gorm:"column:expires_at;not null"`
	RevokedAt *time.Time `gorm:"column:revoked_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
}

type ProjectMember struct {
	ID        string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:char(36);not null"`
	UserID    string    `gorm:"column:user_id;type:char(36);not null"`
	Role      string    `gorm:"column:role;type:varchar(20);not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
}
