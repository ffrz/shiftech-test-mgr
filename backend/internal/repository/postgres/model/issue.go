package model

import "time"

func (Issue) TableName() string { return "issues" }

type Issue struct {
	ID             string    `gorm:"column:id;type:uuid;primaryKey"`
	ProjectID      string    `gorm:"column:project_id;type:uuid;not null"`
	ModuleID       *string   `gorm:"column:module_id;type:uuid"`
	Code           string    `gorm:"column:code;type:text;not null"`
	Type           string    `gorm:"column:type;type:text;not null"`
	Title          string    `gorm:"column:title;type:text;not null"`
	Description    string    `gorm:"column:description;type:text"`
	ActualResult   string    `gorm:"column:actual_result;type:text"`
	ExpectedResult string    `gorm:"column:expected_result;type:text"`
	Priority       string    `gorm:"column:priority;type:text;not null"`
	Status         string    `gorm:"column:status;type:text;not null"`
	AssignedTo     *string   `gorm:"column:assigned_to;type:uuid"`
	GithubLinks    string    `gorm:"column:github_links;type:jsonb;not null"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (IssueTestResult) TableName() string { return "issue_test_results" }

type IssueTestResult struct {
	ID           string    `gorm:"column:id;type:uuid;primaryKey"`
	IssueID      string    `gorm:"column:issue_id;type:uuid;not null"`
	TestResultID string    `gorm:"column:test_result_id;type:uuid;not null"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (IssueTag) TableName() string { return "issue_tags" }

type IssueTag struct {
	ID      string `gorm:"column:id;type:uuid;primaryKey"`
	IssueID string `gorm:"column:issue_id;type:uuid;not null"`
	TagID   string `gorm:"column:tag_id;type:uuid;not null"`
}
