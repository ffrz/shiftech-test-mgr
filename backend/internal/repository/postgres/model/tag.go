package model

import "time"

func (Tag) TableName() string { return "tags" }

type Tag struct {
	ID        string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:uuid;not null"`
	Name      string    `gorm:"column:name;type:text;not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
}
