// Package testplan ports frontend/src/services/testPlanService.ts business
// rules 1:1: name is required (trimmed), description/code trim to
// empty-as-nil, and Duplicate clones a plan's scope (ordered test case ids)
// into a brand-new plan without duplicating the test cases themselves --
// see ARCHITECTURE.md section 4.0.
package testplan

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testplan"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, projectID string) ([]testplan.TestPlan, error) {
	return s.repo.FindAllByProject(ctx, projectID)
}

func (s *Service) GetByID(ctx context.Context, id string) (*testplan.TestPlan, error) {
	return s.repo.FindByID(ctx, id)
}

type CreateInput struct {
	ProjectID   string
	Name        string
	Description string
	Code        string
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*testplan.TestPlan, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("test plan name is required", map[string]string{"name": "required"})
	}
	p := &testplan.TestPlan{
		ProjectID:   input.ProjectID,
		Name:        name,
		Description: strings.TrimSpace(input.Description),
		Code:        strings.TrimSpace(input.Code),
		Status:      testplan.StatusDraft,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

type UpdateInput struct {
	Name        string
	Description string
	Code        *string
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*testplan.TestPlan, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return nil, apperror.Validation("test plan name is required", map[string]string{"name": "required"})
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Name = name
	existing.Description = strings.TrimSpace(input.Description)
	if input.Code != nil {
		existing.Code = strings.TrimSpace(*input.Code)
	}
	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *Service) ChangeStatus(ctx context.Context, id string, status testplan.Status) (*testplan.TestPlan, error) {
	switch status {
	case testplan.StatusDraft, testplan.StatusActive, testplan.StatusCompleted, testplan.StatusArchived:
	default:
		return nil, apperror.Validation("invalid test plan status", map[string]string{"status": "invalid"})
	}
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	existing.Status = status
	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *Service) Remove(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) ListCases(ctx context.Context, testPlanID string) ([]testplan.Case, error) {
	return s.repo.FindCases(ctx, testPlanID)
}

func (s *Service) AddCase(ctx context.Context, testPlanID, testCaseID string, order int) (*testplan.Case, error) {
	c := &testplan.Case{TestPlanID: testPlanID, TestCaseID: testCaseID, Order: order}
	if err := s.repo.AddCase(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

func (s *Service) RemoveCase(ctx context.Context, testPlanCaseID string) error {
	return s.repo.RemoveCase(ctx, testPlanCaseID)
}

// ReorderCases rewrites the order of every plan-case row given, in the order
// the ids were supplied -- mirrors testCaseRepository.reorderCases: sequence
// is a display/inheritance guide only, never an execution constraint.
func (s *Service) ReorderCases(ctx context.Context, orderedTestPlanCaseIDs []string) error {
	return s.repo.ReorderCases(ctx, orderedTestPlanCaseIDs)
}

// Duplicate clones a Test Plan's scope (which test cases it covers, in
// order) into a brand-new plan in the same project. The test cases
// themselves are NOT duplicated -- they are re-attached by the same
// testCaseId, since Test Case is meant to stay reusable/shared across plans.
func (s *Service) Duplicate(ctx context.Context, sourceTestPlanID, newName string) (*testplan.TestPlan, error) {
	source, err := s.repo.FindByID(ctx, sourceTestPlanID)
	if err != nil {
		return nil, err
	}

	newPlan, err := s.Create(ctx, CreateInput{ProjectID: source.ProjectID, Name: newName})
	if err != nil {
		return nil, err
	}

	sourceCases, err := s.repo.FindCases(ctx, sourceTestPlanID)
	if err != nil {
		return nil, err
	}
	for i, sc := range sourceCases {
		if _, err := s.AddCase(ctx, newPlan.ID, sc.TestCaseID, i); err != nil {
			return nil, err
		}
	}

	return newPlan, nil
}
