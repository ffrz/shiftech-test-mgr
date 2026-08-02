package service

import (
	"context"

	"github.com/shiftech/testify-platform/core"
)

// IssueService wraps core.IssueRepository. Business rules for Issue (e.g.
// an Issue may only be created from a TestResult with status FAIL) belong
// here.
type IssueService struct {
	repo core.IssueRepository
}

func NewIssueService(repo core.IssueRepository) *IssueService {
	return &IssueService{repo: repo}
}

func (s *IssueService) List(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
	return s.repo.List(ctx, filter)
}

func (s *IssueService) Get(ctx context.Context, id string) (*core.Issue, error) {
	return s.repo.Get(ctx, id)
}

func (s *IssueService) Create(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
	return s.repo.Create(ctx, input)
}

func (s *IssueService) UpdateStatus(ctx context.Context, id string, status core.IssueStatus) error {
	return s.repo.UpdateStatus(ctx, id, status)
}
