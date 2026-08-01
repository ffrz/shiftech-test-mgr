package issue

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/issue"
)

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string, search string, limit int) ([]issue.Issue, error)
	FindAllByTestRun(ctx context.Context, testRunID string) ([]issue.Issue, error)
	FindAllByTestResult(ctx context.Context, testResultID string) ([]issue.Issue, error)
	FindByID(ctx context.Context, id string) (*issue.Issue, error)
	Create(ctx context.Context, i *issue.Issue) error
	Update(ctx context.Context, i *issue.Issue) error
	UpdateStatus(ctx context.Context, id string, status issue.Status) (*issue.Issue, error)
	Assign(ctx context.Context, id string, assignedTo *string) (*issue.Issue, error)
	Delete(ctx context.Context, id string) error

	LinkToTestResult(ctx context.Context, issueID, testResultID string) error
	UnlinkFromTestResult(ctx context.Context, issueID, testResultID string) error

	// ReplaceTags is a full delete-then-insert of issue_tags for one issue --
	// same find-or-create-then-replace pattern as test_case_tags.
	ReplaceTags(ctx context.Context, issueID string, tagIDs []string) error
}
