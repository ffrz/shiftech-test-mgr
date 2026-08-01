package model

import "time"

func (Issue) TableName() string { return "issues" }

type Issue struct {
	ID             string    `gorm:"column:id;type:char(36);primaryKey"`
	ProjectID      string    `gorm:"column:project_id;type:char(36);not null"`
	ModuleID       *string   `gorm:"column:module_id;type:char(36)"`
	Code           string    `gorm:"column:code;type:varchar(50);not null"`
	Type           string    `gorm:"column:type;type:varchar(20);not null"`
	Title          string    `gorm:"column:title;type:varchar(500);not null"`
	Description    string    `gorm:"column:description;type:text"`
	ActualResult   string    `gorm:"column:actual_result;type:text"`
	ExpectedResult string    `gorm:"column:expected_result;type:text"`
	Priority       string    `gorm:"column:priority;type:varchar(20);not null"`
	Status         string    `gorm:"column:status;type:varchar(20);not null"`
	AssignedTo     *string   `gorm:"column:assigned_to;type:char(36)"`
	GithubLinks    string    `gorm:"column:github_links;type:json;not null"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (IssueTestResult) TableName() string { return "issue_test_results" }

type IssueTestResult struct {
	ID           string    `gorm:"column:id;type:char(36);primaryKey"`
	IssueID      string    `gorm:"column:issue_id;type:char(36);not null"`
	TestResultID string    `gorm:"column:test_result_id;type:char(36);not null"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (IssueTag) TableName() string { return "issue_tags" }

type IssueTag struct {
	ID      string `gorm:"column:id;type:char(36);primaryKey"`
	IssueID string `gorm:"column:issue_id;type:char(36);not null"`
	TagID   string `gorm:"column:tag_id;type:char(36);not null"`
}
