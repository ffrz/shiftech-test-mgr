// Package issue ports frontend/src/services/issueService.ts business rules
// 1:1: title required (trimmed), free-text fields trim to empty-as-nil, and
// tag names are accepted as tag IDs directly here (Tag CRUD/find-or-create
// is owned by a different parallel module -- see task constraints) rather
// than re-implemented. Issue is project-level, not 1:1 with a TestResult --
// linking happens via LinkToTestResult/UnlinkFromTestResult against the
// issue_test_results N:M junction (see ARCHITECTURE.md section 4.0).
package issue

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/issue"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetByID(ctx context.Context, id string) (*issue.Issue, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) ListByProject(ctx context.Context, projectID, search string, limit int) ([]issue.Issue, error) {
	return s.repo.FindAllByProject(ctx, projectID, search, limit)
}

func (s *Service) ListByTestRun(ctx context.Context, testRunID string) ([]issue.Issue, error) {
	return s.repo.FindAllByTestRun(ctx, testRunID)
}

func (s *Service) ListByTestResult(ctx context.Context, testResultID string) ([]issue.Issue, error) {
	return s.repo.FindAllByTestResult(ctx, testResultID)
}

type CreateInput struct {
	ProjectID          string
	ModuleID           *string
	Type               issue.Type
	Title              string
	Description        string
	ActualResult       string
	ExpectedResult     string
	Priority           issue.Priority
	GithubLinks        []issue.GithubLink
	TagIDs             []string
	LinkToTestResultID *string
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*issue.Issue, error) {
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, apperror.Validation("issue title is required", map[string]string{"title": "required"})
	}

	issueType := input.Type
	if issueType == "" {
		issueType = issue.TypeBug
	}
	priority := input.Priority
	if priority == "" {
		priority = issue.PriorityMedium
	}
	links := input.GithubLinks
	if links == nil {
		links = []issue.GithubLink{}
	}

	i := &issue.Issue{
		ProjectID:      input.ProjectID,
		ModuleID:       input.ModuleID,
		Type:           issueType,
		Title:          title,
		Description:    strings.TrimSpace(input.Description),
		ActualResult:   strings.TrimSpace(input.ActualResult),
		ExpectedResult: strings.TrimSpace(input.ExpectedResult),
		Priority:       priority,
		Status:         issue.StatusOpen,
		GithubLinks:    links,
	}
	if err := s.repo.Create(ctx, i); err != nil {
		return nil, err
	}

	if len(input.TagIDs) > 0 {
		if err := s.repo.ReplaceTags(ctx, i.ID, input.TagIDs); err != nil {
			return nil, err
		}
	}

	if input.LinkToTestResultID != nil && *input.LinkToTestResultID != "" {
		if err := s.repo.LinkToTestResult(ctx, i.ID, *input.LinkToTestResultID); err != nil {
			return nil, err
		}
	}

	return i, nil
}

type UpdateInput struct {
	Title          string
	Description    string
	ActualResult   string
	ExpectedResult string
	Priority       issue.Priority
	Type           issue.Type
	ModuleID       *string
	GithubLinks    []issue.GithubLink
	// TagIDs nil means "leave tags untouched"; non-nil (even empty) means
	// "replace with this set" -- mirrors issueService.update's tagNames
	// !== undefined check.
	TagIDs []string
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*issue.Issue, error) {
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, apperror.Validation("issue title is required", map[string]string{"title": "required"})
	}

	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Title = title
	existing.Description = strings.TrimSpace(input.Description)
	existing.ActualResult = strings.TrimSpace(input.ActualResult)
	existing.ExpectedResult = strings.TrimSpace(input.ExpectedResult)
	existing.Priority = input.Priority
	existing.Type = input.Type
	existing.ModuleID = input.ModuleID
	existing.GithubLinks = input.GithubLinks
	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	if input.TagIDs != nil {
		if err := s.repo.ReplaceTags(ctx, id, input.TagIDs); err != nil {
			return nil, err
		}
	}

	return existing, nil
}

func (s *Service) ChangeStatus(ctx context.Context, id string, status issue.Status) (*issue.Issue, error) {
	switch status {
	case issue.StatusOpen, issue.StatusInProgress, issue.StatusResolved, issue.StatusVerified, issue.StatusClosed:
	default:
		return nil, apperror.Validation("invalid issue status", map[string]string{"status": "invalid"})
	}
	return s.repo.UpdateStatus(ctx, id, status)
}

func (s *Service) Assign(ctx context.Context, id string, assignedTo *string) (*issue.Issue, error) {
	return s.repo.Assign(ctx, id, assignedTo)
}

func (s *Service) Remove(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) LinkToTestResult(ctx context.Context, issueID, testResultID string) error {
	return s.repo.LinkToTestResult(ctx, issueID, testResultID)
}

func (s *Service) UnlinkFromTestResult(ctx context.Context, issueID, testResultID string) error {
	return s.repo.UnlinkFromTestResult(ctx, issueID, testResultID)
}
