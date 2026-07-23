package model

import "time"

func (TestRun) TableName() string { return "test_runs" }

type TestRun struct {
	ID          string     `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID   string     `gorm:"column:project_id;type:char(36);not null"`
	TestPlanID  *string    `gorm:"column:test_plan_id;type:char(36)"`
	Code        string     `gorm:"column:code;type:varchar(50);not null"`
	Name        string     `gorm:"column:name;type:varchar(255);not null"`
	Status      string     `gorm:"column:status;type:varchar(20);not null"`
	StartedAt   time.Time  `gorm:"column:started_at"`
	CompletedAt *time.Time `gorm:"column:completed_at"`
	Notes       string     `gorm:"column:notes;type:text"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at"`
}

func (TestResult) TableName() string { return "test_results" }

type TestResult struct {
	ID                     string     `gorm:"column:id;type:char(36);primaryKey"`
	TestRunID              string     `gorm:"column:test_run_id;type:char(36);not null"`
	TestCaseID             string     `gorm:"column:test_case_id;type:char(36);not null"`
	TesterID               *string    `gorm:"column:tester_id;type:char(36)"`
	Status                 string     `gorm:"column:status;type:varchar(20);not null"`
	ExecutedAt             *time.Time `gorm:"column:executed_at"`
	Notes                  string     `gorm:"column:notes;type:text"`
	TestCaseCode           string     `gorm:"column:test_case_code;type:varchar(50)"`
	TestCaseTitle          string     `gorm:"column:test_case_title;type:varchar(500);not null"`
	TestCaseObjective      string     `gorm:"column:test_case_objective;type:text"`
	TestCasePreconditions  string     `gorm:"column:test_case_preconditions;type:text"`
	TestCaseSteps          string     `gorm:"column:test_case_steps;type:text;not null"`
	TestCaseExpectedResult string     `gorm:"column:test_case_expected_result;type:text;not null"`
	TestCasePriority       string     `gorm:"column:test_case_priority;type:varchar(20);not null"`
	Order                  int        `gorm:"column:order;not null"`
	CreatedAt              time.Time  `gorm:"column:created_at"`
	UpdatedAt              time.Time  `gorm:"column:updated_at"`
}

func (TestResultStep) TableName() string { return "test_result_steps" }

type TestResultStep struct {
	ID             string    `gorm:"column:id;type:char(36);primaryKey"`
	TestResultID   string    `gorm:"column:test_result_id;type:char(36);not null"`
	TestCaseStepID string    `gorm:"column:test_case_step_id;type:char(36);not null"`
	Status         string    `gorm:"column:status;type:varchar(20);not null"`
	ActualResult   string    `gorm:"column:actual_result;type:text"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}
