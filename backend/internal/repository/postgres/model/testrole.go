package model

import "time"

func (TestRole) TableName() string { return "test_roles" }

type TestRole struct {
	ID        string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID string    `gorm:"column:project_id;type:uuid;not null"`
	Name      string    `gorm:"column:name;type:text;not null"`
	CreatedAt time.Time `gorm:"column:created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at"`
}
