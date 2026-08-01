package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/testrun"
	testrunsvc "github.com/shiftech/testmgr-backend/internal/service/testrun"
)

type StartTestRunRequest struct {
	TestPlanID string `json:"test_plan_id" validate:"required"`
	Name       string `json:"name" validate:"required,min=1,max=255"`
	Code       string `json:"code" validate:"max=50"`
}

type StartCustomTestRunRequest struct {
	Name        string   `json:"name" validate:"required,min=1,max=255"`
	Code        string   `json:"code" validate:"max=50"`
	TestCaseIDs []string `json:"test_case_ids" validate:"required,min=1"`
}

type RenameTestRunRequest struct {
	Name string `json:"name" validate:"required,min=1,max=255"`
	Code string `json:"code" validate:"required,min=1,max=50"`
}

type CompleteTestRunRequest struct {
	Notes *string `json:"notes"`
}

type RecordTestResultRequest struct {
	Status   string  `json:"status" validate:"required,oneof=pass fail skip blocked not_run"`
	TesterID *string `json:"tester_id" validate:"required"`
	Notes    string  `json:"notes"`
}

type RecordTestResultStepRequest struct {
	Status       string `json:"status" validate:"required,oneof=pass fail not_run"`
	ActualResult string `json:"actual_result"`
}

type TestRunResponse struct {
	ID          string     `json:"id"`
	ProjectID   string     `json:"project_id"`
	TestPlanID  *string    `json:"test_plan_id"`
	Code        string     `json:"code"`
	Name        string     `json:"name"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at"`
	Notes       string     `json:"notes"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func FromTestRun(r testrun.TestRun) TestRunResponse {
	return TestRunResponse{
		ID:          r.ID,
		ProjectID:   r.ProjectID,
		TestPlanID:  r.TestPlanID,
		Code:        r.Code,
		Name:        r.Name,
		Status:      string(r.Status),
		StartedAt:   r.StartedAt,
		CompletedAt: r.CompletedAt,
		Notes:       r.Notes,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

func FromTestRuns(runs []testrun.TestRun) []TestRunResponse {
	result := make([]TestRunResponse, len(runs))
	for i, r := range runs {
		result[i] = FromTestRun(r)
	}
	return result
}

type TestResultResponse struct {
	ID                     string     `json:"id"`
	TestRunID              string     `json:"test_run_id"`
	TestCaseID             string     `json:"test_case_id"`
	TesterID               *string    `json:"tester_id"`
	Status                 string     `json:"status"`
	ExecutedAt             *time.Time `json:"executed_at"`
	Notes                  string     `json:"notes"`
	TestCaseCode           string     `json:"test_case_code"`
	TestCaseTitle          string     `json:"test_case_title"`
	TestCaseObjective      string     `json:"test_case_objective"`
	TestCasePreconditions  string     `json:"test_case_preconditions"`
	TestCaseSteps          string     `json:"test_case_steps"`
	TestCaseExpectedResult string     `json:"test_case_expected_result"`
	TestCasePriority       string     `json:"test_case_priority"`
	Order                  int        `json:"order"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

func FromTestResult(r testrun.Result) TestResultResponse {
	return TestResultResponse{
		ID:                     r.ID,
		TestRunID:              r.TestRunID,
		TestCaseID:             r.TestCaseID,
		TesterID:               r.TesterID,
		Status:                 string(r.Status),
		ExecutedAt:             r.ExecutedAt,
		Notes:                  r.Notes,
		TestCaseCode:           r.TestCaseCode,
		TestCaseTitle:          r.TestCaseTitle,
		TestCaseObjective:      r.TestCaseObjective,
		TestCasePreconditions:  r.TestCasePreconditions,
		TestCaseSteps:          r.TestCaseSteps,
		TestCaseExpectedResult: r.TestCaseExpectedResult,
		TestCasePriority:       r.TestCasePriority,
		Order:                  r.Order,
		CreatedAt:              r.CreatedAt,
		UpdatedAt:              r.UpdatedAt,
	}
}

func FromTestResults(results []testrun.Result) []TestResultResponse {
	result := make([]TestResultResponse, len(results))
	for i, r := range results {
		result[i] = FromTestResult(r)
	}
	return result
}

type TestRunSummaryResponse struct {
	Total           int `json:"total"`
	Pass            int `json:"pass"`
	Fail            int `json:"fail"`
	Skip            int `json:"skip"`
	Blocked         int `json:"blocked"`
	NotRun          int `json:"not_run"`
	Executed        int `json:"executed"`
	ProgressPercent int `json:"progress_percent"`
}

func FromTestRunSummary(s testrun.Summary) TestRunSummaryResponse {
	return TestRunSummaryResponse{
		Total:           s.Total,
		Pass:            s.Pass,
		Fail:            s.Fail,
		Skip:            s.Skip,
		Blocked:         s.Blocked,
		NotRun:          s.NotRun,
		Executed:        s.Executed,
		ProgressPercent: s.ProgressPercent,
	}
}

type TestRunWithResultsResponse struct {
	Results []TestResultResponse   `json:"results"`
	Summary TestRunSummaryResponse `json:"summary"`
}

func FromTestRunWithResults(w testrunsvc.WithResults) TestRunWithResultsResponse {
	return TestRunWithResultsResponse{
		Results: FromTestResults(w.Results),
		Summary: FromTestRunSummary(w.Summary),
	}
}

type TestResultStepResponse struct {
	ID             string    `json:"id"`
	TestResultID   string    `json:"test_result_id"`
	TestCaseStepID string    `json:"test_case_step_id"`
	Status         string    `json:"status"`
	ActualResult   string    `json:"actual_result"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func FromTestResultStep(s testrun.ResultStep) TestResultStepResponse {
	return TestResultStepResponse{
		ID:             s.ID,
		TestResultID:   s.TestResultID,
		TestCaseStepID: s.TestCaseStepID,
		Status:         string(s.Status),
		ActualResult:   s.ActualResult,
		CreatedAt:      s.CreatedAt,
		UpdatedAt:      s.UpdatedAt,
	}
}
