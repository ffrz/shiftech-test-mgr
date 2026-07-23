package model

import "time"

func (Tag) TableName() string { return "tags" }

type Tag struct {
	ID        string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:char(36);not null"`
	Name      string    `gorm:"column:name;type:varchar(255);not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
}
