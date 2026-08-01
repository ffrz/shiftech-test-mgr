package model

import "time"

func (TestCase) TableName() string { return "test_cases" }

type TestCase struct {
	ID             string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID      string    `gorm:"column:project_id;type:uuid;not null"`
	ModuleID       *string   `gorm:"column:module_id;type:uuid"`
	Code           string    `gorm:"column:code;type:text;not null"`
	Title          string    `gorm:"column:title;type:text;not null"`
	Objective      string    `gorm:"column:objective;type:text"`
	Preconditions  string    `gorm:"column:preconditions;type:text"`
	Steps          string    `gorm:"column:steps;type:text;not null"`
	ExpectedResult string    `gorm:"column:expected_result;type:text;not null"`
	Priority       string    `gorm:"column:priority;type:text;not null"`
	Status         string    `gorm:"column:status;type:text;not null"`
	Notes          string    `gorm:"column:notes;type:text"`
	StepType       string    `gorm:"column:step_type;type:text;not null"`
	TargetRoleID   *string   `gorm:"column:target_role_id;type:uuid"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (TestCaseStep) TableName() string { return "test_case_steps" }

type TestCaseStep struct {
	ID             string    `gorm:"column:id;type:uuid;primaryKey"`
	TestCaseID     string    `gorm:"column:test_case_id;type:uuid;not null"`
	StepNumber     int       `gorm:"column:step_number;not null"`
	Action         string    `gorm:"column:action;type:text;not null"`
	ExpectedResult *string   `gorm:"column:expected_result;type:text"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (TestCaseTag) TableName() string { return "test_case_tags" }

type TestCaseTag struct {
	TestCaseID string `gorm:"column:test_case_id;type:uuid;primaryKey"`
	TagID      string `gorm:"column:tag_id;type:uuid;primaryKey"`
}
