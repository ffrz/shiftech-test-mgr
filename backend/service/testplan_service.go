package service

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
)

// TestPlanService wraps core.TestPlanRepository. Business rules for TestPlan
// (e.g. approval preconditions, case scope validation) belong here.
type TestPlanService struct {
	repo      core.TestPlanRepository
	testCases core.TestCaseRepository
	activity  core.ActivityRepository
}

// NewTestPlanService wires the repository plus the activity repository
// needed to log status_change events on ChangeStatus (mirrors
// frontend/src/services/testPlanService.ts changeStatus).
func NewTestPlanService(repo core.TestPlanRepository, testCases core.TestCaseRepository, activity core.ActivityRepository) *TestPlanService {
	return &TestPlanService{repo: repo, testCases: testCases, activity: activity}
}

// ExecutionContext resolves every case in plan order, including detailed
// steps. It is deliberately assembled in the domain service so every
// transport exposes the same complete execution contract.
func (s *TestPlanService) ExecutionContext(ctx context.Context, id string) (*core.TestPlanExecutionContext, error) {
	plan, err := s.repo.Get(ctx, id)
	if err != nil {
		return nil, err
	}
	if s.testCases == nil {
		return nil, fmt.Errorf("test plan execution context is not configured")
	}
	cases := make([]core.TestCase, 0, len(plan.CaseIDs))
	for _, caseID := range plan.CaseIDs {
		testCase, err := s.testCases.Get(ctx, caseID)
		if err != nil {
			return nil, fmt.Errorf("load test case %s: %w", caseID, err)
		}
		if testCase.ProjectID != plan.ProjectID {
			return nil, fmt.Errorf("test case %s does not belong to plan project", caseID)
		}
		cases = append(cases, *testCase)
	}
	return &core.TestPlanExecutionContext{Plan: *plan, Cases: cases}, nil
}

func (s *TestPlanService) List(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestPlanService) Get(ctx context.Context, id string) (*core.TestPlan, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestPlanService) Create(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
	return s.repo.Create(ctx, input)
}

func (s *TestPlanService) AddCases(ctx context.Context, planID string, caseIDs []string) error {
	return s.repo.AddCases(ctx, planID, caseIDs)
}

func (s *TestPlanService) RemoveCases(ctx context.Context, planID string, caseIDs []string) error {
	return s.repo.RemoveCases(ctx, planID, caseIDs)
}

func (s *TestPlanService) Approve(ctx context.Context, id string, approverID string) error {
	return s.repo.Approve(ctx, id, approverID)
}

// ChangeStatus sets a test plan's status and logs a status_change activity
// entry only when the status actually changed (mirrors frontend
// testPlanService.changeStatus). Use Approve instead for the human-gated
// draft->active transition.
func (s *TestPlanService) ChangeStatus(ctx context.Context, id string, status core.TestPlanStatus, actorID, projectID string) error {
	current, err := s.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	from := current.Status
	if from == status {
		return nil
	}
	if err := s.repo.ChangeStatus(ctx, id, status); err != nil {
		return err
	}
	if err := s.activity.Create(ctx, core.CreateActivityInput{
		ProjectID:  projectID,
		EntityType: "test_plan",
		EntityID:   id,
		ActorID:    actorID,
		EventType:  "status_change",
		Payload:    map[string]any{"from": string(from), "to": string(status)},
	}); err != nil {
		return fmt.Errorf("log activity: %w", err)
	}
	return nil
}
