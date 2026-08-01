package model

import "time"

func (Profile) TableName() string       { return "profiles" }
func (RefreshToken) TableName() string  { return "refresh_tokens" }
func (ProjectMember) TableName() string { return "project_members" }

type Profile struct {
	ID        string     `gorm:"column:id;type:uuid;primaryKey"`
	Email     string     `gorm:"column:email;type:text;not null"`
	FullName  string     `gorm:"column:full_name;type:text"`
	AvatarURL string     `gorm:"column:avatar_url;type:text"`
	Role      string     `gorm:"column:role;type:text;not null"`
	DeletedAt *time.Time `gorm:"column:deleted_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
	UpdatedAt time.Time  `gorm:"column:updated_at"`
}

type RefreshToken struct {
	ID        string     `gorm:"column:id;type:uuid;primaryKey"`
	UserID    string     `gorm:"column:user_id;type:uuid;not null"`
	TokenHash string     `gorm:"column:token_hash;type:varchar(255);not null"`
	ExpiresAt time.Time  `gorm:"column:expires_at;not null"`
	RevokedAt *time.Time `gorm:"column:revoked_at"`
	CreatedAt time.Time  `gorm:"column:created_at"`
}

type ProjectMember struct {
	ID        string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:uuid;not null"`
	UserID    string    `gorm:"column:user_id;type:uuid;not null"`
	Role      string    `gorm:"column:role;type:varchar(20);not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
}
