// Package testcase ports frontend/src/services/testCaseService.ts business
// rules 1:1: title is required (trimmed); for step_type "simple", steps and
// expected_result are required; for step_type "detailed", at least one
// detailed step is required. Code auto-generation (entity_code_sequences)
// is explicitly out of scope for this task — an empty code is accepted and
// persisted as-is.
package testcase

import (
	"context"
	"strings"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testcase"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, projectID string, query testcase.Query) ([]testcase.TestCase, error) {
	return s.repo.FindAllByProject(ctx, projectID, query)
}

func (s *Service) GetByID(ctx context.Context, id string) (*testcase.WithDetails, error) {
	return s.repo.FindByID(ctx, id)
}

// DetailedStepInput mirrors the frontend's { action, expectedResult? }
// shape passed into create/update before step trimming/filtering.
type DetailedStepInput struct {
	Action         string
	ExpectedResult string
}

type CreateInput struct {
	ProjectID      string
	ModuleID       *string
	Code           string
	Title          string
	Objective      string
	Preconditions  string
	Steps          string
	ExpectedResult string
	Priority       testcase.Priority
	Notes          string
	StepType       testcase.StepType
	TargetRoleID   *string
	// TagIDs are already-resolved tag IDs — resolving free-text tag names to
	// IDs (find-or-create) is tagService.saveTagsForTestCase's job on the
	// frontend and belongs to the Tag module, which is separate parallel
	// work not yet wired into this backend (see task constraints). Callers
	// that need name-based creation must resolve names to IDs upstream of
	// this service until that module lands.
	TagIDs        []string
	DetailedSteps []DetailedStepInput
}

func (s *Service) Create(ctx context.Context, input CreateInput) (*testcase.TestCase, error) {
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, apperror.Validation("test case title is required", map[string]string{"title": "required"})
	}

	stepType := input.StepType
	if stepType == "" {
		stepType = testcase.StepTypeSimple
	}

	steps := strings.TrimSpace(input.Steps)
	expectedResult := strings.TrimSpace(input.ExpectedResult)

	if stepType == testcase.StepTypeSimple {
		if steps == "" {
			return nil, apperror.Validation("test case steps are required", map[string]string{"steps": "required"})
		}
		if expectedResult == "" {
			return nil, apperror.Validation("test case expected result is required", map[string]string{"expectedResult": "required"})
		}
	} else if len(input.DetailedSteps) == 0 {
		return nil, apperror.Validation("a detailed test case needs at least one step", map[string]string{"detailedSteps": "required"})
	}

	priority := input.Priority
	if priority == "" {
		priority = testcase.PriorityMedium
	}

	tc := &testcase.TestCase{
		ProjectID:      input.ProjectID,
		ModuleID:       input.ModuleID,
		Code:           strings.TrimSpace(input.Code),
		Title:          title,
		Objective:      strings.TrimSpace(input.Objective),
		Preconditions:  strings.TrimSpace(input.Preconditions),
		Steps:          steps,
		ExpectedResult: expectedResult,
		Priority:       priority,
		Status:         testcase.StatusActive,
		Notes:          strings.TrimSpace(input.Notes),
		StepType:       stepType,
		TargetRoleID:   input.TargetRoleID,
	}
	if err := s.repo.Create(ctx, tc); err != nil {
		return nil, err
	}

	if len(input.TagIDs) > 0 {
		if err := s.repo.SaveTags(ctx, tc.ID, dedupe(input.TagIDs)); err != nil {
			return nil, err
		}
	}

	if stepType == testcase.StepTypeDetailed && input.DetailedSteps != nil {
		if _, err := s.repo.ReplaceSteps(ctx, tc.ID, cleanSteps(input.DetailedSteps)); err != nil {
			return nil, err
		}
	}

	return tc, nil
}

// UpdateInput uses pointer/nil-as-"not provided" fields (mirroring the
// frontend's Partial<TestCase>) so PATCH-style partial updates only touch
// the columns the caller actually sent — TagNames/DetailedSteps use nil
// slices for "unset" vs. an empty-but-non-nil slice for "clear everything".
type UpdateInput struct {
	ModuleID       *string
	ModuleIDSet    bool
	Code           *string
	Title          *string
	Objective      *string
	Preconditions  *string
	Steps          *string
	ExpectedResult *string
	Priority       *testcase.Priority
	Status         *testcase.Status
	Notes          *string
	StepType       *testcase.StepType
	TargetRoleID   *string
	TargetRoleSet  bool
	// See CreateInput.TagIDs — same already-resolved-ID contract.
	TagIDs        []string
	TagIDsSet     bool
	DetailedSteps []DetailedStepInput
	DetailedSet   bool
}

func (s *Service) Update(ctx context.Context, id string, input UpdateInput) (*testcase.TestCase, error) {
	existing, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	tc := existing.TestCase

	if input.ModuleIDSet {
		tc.ModuleID = input.ModuleID
	}
	if input.Code != nil {
		tc.Code = strings.TrimSpace(*input.Code)
	}
	if input.Title != nil {
		title := strings.TrimSpace(*input.Title)
		if title == "" {
			return nil, apperror.Validation("test case title is required", map[string]string{"title": "required"})
		}
		tc.Title = title
	}
	if input.Objective != nil {
		tc.Objective = strings.TrimSpace(*input.Objective)
	}
	if input.Preconditions != nil {
		tc.Preconditions = strings.TrimSpace(*input.Preconditions)
	}
	if input.Steps != nil {
		tc.Steps = strings.TrimSpace(*input.Steps)
	}
	if input.ExpectedResult != nil {
		tc.ExpectedResult = strings.TrimSpace(*input.ExpectedResult)
	}
	if input.Priority != nil {
		tc.Priority = *input.Priority
	}
	if input.Status != nil {
		tc.Status = *input.Status
	}
	if input.Notes != nil {
		tc.Notes = strings.TrimSpace(*input.Notes)
	}
	if input.StepType != nil {
		tc.StepType = *input.StepType
	}
	if input.TargetRoleSet {
		tc.TargetRoleID = input.TargetRoleID
	}

	if tc.StepType == testcase.StepTypeSimple {
		if tc.Steps == "" {
			return nil, apperror.Validation("test case steps are required", map[string]string{"steps": "required"})
		}
		if tc.ExpectedResult == "" {
			return nil, apperror.Validation("test case expected result is required", map[string]string{"expectedResult": "required"})
		}
	}

	if err := s.repo.Update(ctx, &tc); err != nil {
		return nil, err
	}

	if input.TagIDsSet {
		if err := s.repo.SaveTags(ctx, id, dedupe(input.TagIDs)); err != nil {
			return nil, err
		}
	}

	if tc.StepType == testcase.StepTypeDetailed && input.DetailedSet {
		if _, err := s.repo.ReplaceSteps(ctx, id, cleanSteps(input.DetailedSteps)); err != nil {
			return nil, err
		}
	}

	return &tc, nil
}

func (s *Service) Archive(ctx context.Context, id string) (*testcase.TestCase, error) {
	status := testcase.StatusArchived
	return s.Update(ctx, id, UpdateInput{Status: &status})
}

func (s *Service) Reactivate(ctx context.Context, id string) (*testcase.TestCase, error) {
	status := testcase.StatusActive
	return s.Update(ctx, id, UpdateInput{Status: &status})
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// dedupe mirrors the `[...new Set(...)]` step in tagService.saveTagsForTestCase
// (minus the name-to-ID resolution, which belongs to the not-yet-wired Tag
// module — see CreateInput.TagIDs).
func dedupe(ids []string) []string {
	unique := make([]string, 0, len(ids))
	seen := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		trimmed := strings.TrimSpace(id)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		unique = append(unique, trimmed)
	}
	return unique
}

func cleanSteps(steps []DetailedStepInput) []StepInput {
	cleaned := make([]StepInput, 0, len(steps))
	for _, st := range steps {
		action := strings.TrimSpace(st.Action)
		if action == "" {
			continue
		}
		cleaned = append(cleaned, StepInput{
			Action:         action,
			ExpectedResult: strings.TrimSpace(st.ExpectedResult),
		})
	}
	return cleaned
}
