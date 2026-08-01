package model

import "time"

func (TestPlan) TableName() string { return "test_plans" }

type TestPlan struct {
	ID          string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID   string    `gorm:"column:project_id;type:char(36);not null"`
	Code        string    `gorm:"column:code;type:varchar(50);not null"`
	Name        string    `gorm:"column:name;type:varchar(255);not null"`
	Description string    `gorm:"column:description;type:text"`
	Status      string    `gorm:"column:status;type:varchar(20);not null"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (TestPlanCase) TableName() string { return "test_plan_cases" }

type TestPlanCase struct {
	ID         string `gorm:"column:id;type:char(36);primaryKey"`
	TestPlanID string `gorm:"column:test_plan_id;type:char(36);not null"`
	TestCaseID string `gorm:"column:test_case_id;type:char(36);not null"`
	Order      int    `gorm:"column:order;not null"`
}
