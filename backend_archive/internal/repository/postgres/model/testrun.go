package model

import "time"

func (TestRun) TableName() string { return "test_runs" }

type TestRun struct {
	ID          string     `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID   string     `gorm:"column:project_id;type:uuid;not null"`
	TestPlanID  *string    `gorm:"column:test_plan_id;type:uuid"`
	Code        string     `gorm:"column:code;type:text;not null"`
	Name        string     `gorm:"column:name;type:text;not null"`
	Status      string     `gorm:"column:status;type:text;not null"`
	StartedAt   time.Time  `gorm:"column:started_at"`
	CompletedAt *time.Time `gorm:"column:completed_at"`
	Notes       string     `gorm:"column:notes;type:text"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at"`
}

func (TestResult) TableName() string { return "test_results" }

type TestResult struct {
	ID                     string     `gorm:"column:id;type:uuid;primaryKey"`
	TestRunID              string     `gorm:"column:test_run_id;type:uuid;not null"`
	TestCaseID             string     `gorm:"column:test_case_id;type:uuid;not null"`
	TesterID               *string    `gorm:"column:tester_id;type:uuid"`
	Status                 string     `gorm:"column:status;type:text;not null"`
	ExecutedAt             *time.Time `gorm:"column:executed_at"`
	Notes                  string     `gorm:"column:notes;type:text"`
	TestCaseCode           string     `gorm:"column:test_case_code;type:text"`
	TestCaseTitle          string     `gorm:"column:test_case_title;type:text;not null"`
	TestCaseObjective      string     `gorm:"column:test_case_objective;type:text"`
	TestCasePreconditions  string     `gorm:"column:test_case_preconditions;type:text"`
	TestCaseSteps          string     `gorm:"column:test_case_steps;type:text;not null"`
	TestCaseExpectedResult string     `gorm:"column:test_case_expected_result;type:text;not null"`
	TestCasePriority       string     `gorm:"column:test_case_priority;type:text;not null"`
	Order                  int        `gorm:"column:order;not null"`
	CreatedAt              time.Time  `gorm:"column:created_at"`
	UpdatedAt              time.Time  `gorm:"column:updated_at"`
}

func (TestResultStep) TableName() string { return "test_result_steps" }

type TestResultStep struct {
	ID             string    `gorm:"column:id;type:uuid;primaryKey"`
	TestResultID   string    `gorm:"column:test_result_id;type:uuid;not null"`
	TestCaseStepID string    `gorm:"column:test_case_step_id;type:uuid;not null"`
	Status         string    `gorm:"column:status;type:text;not null"`
	ActualResult   string    `gorm:"column:actual_result;type:text"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}
