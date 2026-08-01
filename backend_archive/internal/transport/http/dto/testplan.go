package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/testplan"
)

type CreateTestPlanRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=255"`
	Description string `json:"description" validate:"max=2000"`
	Code        string `json:"code" validate:"max=50"`
}

type UpdateTestPlanRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=255"`
	Description string  `json:"description" validate:"max=2000"`
	Code        *string `json:"code" validate:"omitempty,max=50"`
}

type ChangeTestPlanStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=draft active completed archived"`
}

type DuplicateTestPlanRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
}

type AddTestPlanCaseRequest struct {
	TestCaseID string `json:"test_case_id" validate:"required"`
	Order      int    `json:"order"`
}

type ReorderTestPlanCasesRequest struct {
	OrderedTestPlanCaseIDs []string `json:"ordered_test_plan_case_ids" validate:"required,min=1"`
}

type TestPlanResponse struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func FromTestPlan(p testplan.TestPlan) TestPlanResponse {
	return TestPlanResponse{
		ID:          p.ID,
		ProjectID:   p.ProjectID,
		Code:        p.Code,
		Name:        p.Name,
		Description: p.Description,
		Status:      string(p.Status),
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

func FromTestPlans(plans []testplan.TestPlan) []TestPlanResponse {
	result := make([]TestPlanResponse, len(plans))
	for i, p := range plans {
		result[i] = FromTestPlan(p)
	}
	return result
}

type TestPlanCaseResponse struct {
	ID         string `json:"id"`
	TestPlanID string `json:"test_plan_id"`
	TestCaseID string `json:"test_case_id"`
	Order      int    `json:"order"`
}

func FromTestPlanCase(c testplan.Case) TestPlanCaseResponse {
	return TestPlanCaseResponse{
		ID:         c.ID,
		TestPlanID: c.TestPlanID,
		TestCaseID: c.TestCaseID,
		Order:      c.Order,
	}
}

func FromTestPlanCases(cases []testplan.Case) []TestPlanCaseResponse {
	result := make([]TestPlanCaseResponse, len(cases))
	for i, c := range cases {
		result[i] = FromTestPlanCase(c)
	}
	return result
}
