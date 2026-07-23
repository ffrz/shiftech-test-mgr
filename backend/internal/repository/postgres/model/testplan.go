package model

import "time"

func (TestPlan) TableName() string { return "test_plans" }

type TestPlan struct {
	ID          string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID   string    `gorm:"column:project_id;type:uuid;not null"`
	Code        string    `gorm:"column:code;type:text;not null"`
	Name        string    `gorm:"column:name;type:text;not null"`
	Description string    `gorm:"column:description;type:text"`
	Status      string    `gorm:"column:status;type:text;not null"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (TestPlanCase) TableName() string { return "test_plan_cases" }

type TestPlanCase struct {
	ID         string `gorm:"column:id;type:uuid;primaryKey"`
	TestPlanID string `gorm:"column:test_plan_id;type:uuid;not null"`
	TestCaseID string `gorm:"column:test_case_id;type:uuid;not null"`
	Order      int    `gorm:"column:order;not null"`
}
