package model

import "time"

func (Project) TableName() string { return "projects" }

type Project struct {
	ID          string    `gorm:"column:id;type:char(36);primaryKey"`
	Name        string    `gorm:"column:name;type:varchar(255);not null"`
	Description string    `gorm:"column:description;type:text"`
	Status      string    `gorm:"column:status;type:varchar(20);not null"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}
