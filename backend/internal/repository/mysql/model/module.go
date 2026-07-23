package model

import "time"

func (Module) TableName() string { return "modules" }

type Module struct {
	ID        string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:char(36);not null"`
	Code      string    `gorm:"column:code;type:varchar(50);not null"`
	Name      string    `gorm:"column:name;type:varchar(255);not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}
