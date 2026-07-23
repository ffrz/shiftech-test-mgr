package issue

import "time"

type Type string

const (
	TypeBug         Type = "bug"
	TypeFeature     Type = "feature"
	TypeImprovement Type = "improvement"
	TypeTask        Type = "task"
)

type Priority string

const (
	PriorityLow      Priority = "low"
	PriorityMedium   Priority = "medium"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

type Status string

const (
	StatusOpen       Status = "open"
	StatusInProgress Status = "in_progress"
	StatusResolved   Status = "resolved"
	StatusVerified   Status = "verified"
	StatusClosed     Status = "closed"
)

// GithubLink is a small free-form reference to an external GitHub issue/PR,
// stored as a JSON array on the Issue row (see migrations: issues.github_links).
type GithubLink struct {
	URL   string `json:"url"`
	Label string `json:"label,omitempty"`
}

// Issue is project-level -- it is NOT bound 1:1 to a single TestResult. It
// can stand alone (a feature request, a general finding) or be linked to any
// number of TestResults via the issue_test_results junction (see TestResult,
// Link).
type Issue struct {
	ID             string
	ProjectID      string
	ModuleID       *string
	Code           string
	Type           Type
	Title          string
	Description    string
	ActualResult   string
	ExpectedResult string
	Priority       Priority
	Status         Status
	AssignedTo     *string
	GithubLinks    []GithubLink
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Link is the issue_test_results junction row (N:M).
type Link struct {
	ID           string
	IssueID      string
	TestResultID string
	CreatedAt    time.Time
}

// TagLink is the issue_tags junction row (N:M, reuses the shared tags table
// owned by a different module).
type TagLink struct {
	ID      string
	IssueID string
	TagID   string
}
