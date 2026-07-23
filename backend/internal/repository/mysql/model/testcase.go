package model

import "time"

func (TestCase) TableName() string { return "test_cases" }

type TestCase struct {
	ID             string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID      string    `gorm:"column:project_id;type:char(36);not null"`
	ModuleID       *string   `gorm:"column:module_id;type:char(36)"`
	Code           string    `gorm:"column:code;type:varchar(50);not null"`
	Title          string    `gorm:"column:title;type:varchar(500);not null"`
	Objective      string    `gorm:"column:objective;type:text"`
	Preconditions  string    `gorm:"column:preconditions;type:text"`
	Steps          string    `gorm:"column:steps;type:text;not null"`
	ExpectedResult string    `gorm:"column:expected_result;type:text;not null"`
	Priority       string    `gorm:"column:priority;type:varchar(20);not null"`
	Status         string    `gorm:"column:status;type:varchar(20);not null"`
	Notes          string    `gorm:"column:notes;type:text"`
	StepType       string    `gorm:"column:step_type;type:varchar(20);not null"`
	TargetRoleID   *string   `gorm:"column:target_role_id;type:char(36)"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (TestCaseStep) TableName() string { return "test_case_steps" }

type TestCaseStep struct {
	ID             string    `gorm:"column:id;type:char(36);primaryKey"`
	TestCaseID     string    `gorm:"column:test_case_id;type:char(36);not null"`
	StepNumber     int       `gorm:"column:step_number;not null"`
	Action         string    `gorm:"column:action;type:text;not null"`
	ExpectedResult *string   `gorm:"column:expected_result;type:text"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (TestCaseTag) TableName() string { return "test_case_tags" }

type TestCaseTag struct {
	TestCaseID string `gorm:"column:test_case_id;type:char(36);primaryKey"`
	TagID      string `gorm:"column:tag_id;type:char(36);primaryKey"`
}
