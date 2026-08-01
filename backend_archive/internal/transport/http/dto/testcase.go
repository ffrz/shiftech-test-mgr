package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/testcase"
)

type TestCaseStepRequest struct {
	Action         string `json:"action" validate:"required,min=1"`
	ExpectedResult string `json:"expected_result"`
}

type CreateTestCaseRequest struct {
	ModuleID       *string               `json:"module_id"`
	Code           string                `json:"code" validate:"max=50"`
	Title          string                `json:"title" validate:"required,min=1,max=500"`
	Objective      string                `json:"objective"`
	Preconditions  string                `json:"preconditions"`
	Steps          string                `json:"steps"`
	ExpectedResult string                `json:"expected_result"`
	Priority       string                `json:"priority" validate:"omitempty,oneof=low medium high critical"`
	Notes          string                `json:"notes"`
	StepType       string                `json:"step_type" validate:"omitempty,oneof=simple detailed"`
	TargetRoleID   *string               `json:"target_role_id"`
	TagIDs         []string              `json:"tag_ids"`
	DetailedSteps  []TestCaseStepRequest `json:"detailed_steps"`
}

// UpdateTestCaseRequest uses pointer fields so a field absent from the JSON
// body means "leave unchanged", matching the frontend's Partial<TestCase>
// update contract — TagIDs/DetailedSteps use an explicit *Set flag pattern
// via pointer-to-slice so "[]" (clear) can be told apart from "omitted".
type UpdateTestCaseRequest struct {
	ModuleID       *string                `json:"module_id"`
	ModuleIDSet    bool                   `json:"-"`
	Code           *string                `json:"code" validate:"omitempty,max=50"`
	Title          *string                `json:"title" validate:"omitempty,min=1,max=500"`
	Objective      *string                `json:"objective"`
	Preconditions  *string                `json:"preconditions"`
	Steps          *string                `json:"steps"`
	ExpectedResult *string                `json:"expected_result"`
	Priority       *string                `json:"priority" validate:"omitempty,oneof=low medium high critical"`
	Status         *string                `json:"status" validate:"omitempty,oneof=active archived"`
	Notes          *string                `json:"notes"`
	StepType       *string                `json:"step_type" validate:"omitempty,oneof=simple detailed"`
	TargetRoleID   *string                `json:"target_role_id"`
	TargetRoleSet  bool                   `json:"-"`
	TagIDs         *[]string              `json:"tag_ids"`
	DetailedSteps  *[]TestCaseStepRequest `json:"detailed_steps"`
}

type TestCaseStepResponse struct {
	ID             string `json:"id"`
	StepNumber     int    `json:"step_number"`
	Action         string `json:"action"`
	ExpectedResult string `json:"expected_result"`
}

type TestCaseResponse struct {
	ID             string    `json:"id"`
	ProjectID      string    `json:"project_id"`
	ModuleID       *string   `json:"module_id"`
	Code           string    `json:"code"`
	Title          string    `json:"title"`
	Objective      string    `json:"objective"`
	Preconditions  string    `json:"preconditions"`
	Steps          string    `json:"steps"`
	ExpectedResult string    `json:"expected_result"`
	Priority       string    `json:"priority"`
	Status         string    `json:"status"`
	Notes          string    `json:"notes"`
	StepType       string    `json:"step_type"`
	TargetRoleID   *string   `json:"target_role_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type TestCaseWithDetailsResponse struct {
	TestCaseResponse
	Steps  []TestCaseStepResponse `json:"steps"`
	TagIDs []string               `json:"tag_ids"`
}

func FromTestCase(tc testcase.TestCase) TestCaseResponse {
	return TestCaseResponse{
		ID:             tc.ID,
		ProjectID:      tc.ProjectID,
		ModuleID:       tc.ModuleID,
		Code:           tc.Code,
		Title:          tc.Title,
		Objective:      tc.Objective,
		Preconditions:  tc.Preconditions,
		Steps:          tc.Steps,
		ExpectedResult: tc.ExpectedResult,
		Priority:       string(tc.Priority),
		Status:         string(tc.Status),
		Notes:          tc.Notes,
		StepType:       string(tc.StepType),
		TargetRoleID:   tc.TargetRoleID,
		CreatedAt:      tc.CreatedAt,
		UpdatedAt:      tc.UpdatedAt,
	}
}

func FromTestCases(cases []testcase.TestCase) []TestCaseResponse {
	result := make([]TestCaseResponse, len(cases))
	for i, tc := range cases {
		result[i] = FromTestCase(tc)
	}
	return result
}

func FromTestCaseWithDetails(tc testcase.WithDetails) TestCaseWithDetailsResponse {
	steps := make([]TestCaseStepResponse, len(tc.Steps))
	for i, s := range tc.Steps {
		steps[i] = TestCaseStepResponse{
			ID:             s.ID,
			StepNumber:     s.StepNumber,
			Action:         s.Action,
			ExpectedResult: s.ExpectedResult,
		}
	}
	tagIDs := tc.TagIDs
	if tagIDs == nil {
		tagIDs = []string{}
	}
	return TestCaseWithDetailsResponse{
		TestCaseResponse: FromTestCase(tc.TestCase),
		Steps:            steps,
		TagIDs:           tagIDs,
	}
}
