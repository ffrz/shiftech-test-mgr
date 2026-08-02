package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/shiftech/testify-platform/core"
)

// AutomationService wraps core.AutomationRepository. Validation mirrors the
// Node automationService (schema_055/056 error strings are kept so MCP clients
// that match on them keep working).
type AutomationService struct {
	repo core.AutomationRepository
}

func NewAutomationService(repo core.AutomationRepository) *AutomationService {
	return &AutomationService{repo: repo}
}

func (s *AutomationService) MapScript(ctx context.Context, input core.MapScriptInput) (*core.AutomationScript, error) {
	ref := strings.TrimSpace(input.ScriptRef)
	if len(ref) < 1 || len(ref) > 500 {
		return nil, fmt.Errorf("INVALID_SCRIPT_REF")
	}
	input.ScriptRef = ref
	return s.repo.MapScript(ctx, input)
}

func (s *AutomationService) Enqueue(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
	if (input.TestCaseID == nil) == (input.TestPlanID == nil) {
		return nil, fmt.Errorf("EXACTLY_ONE_AUTOMATION_TARGET_REQUIRED")
	}
	if input.MaxAttempts < 1 || input.MaxAttempts > 10 {
		return nil, fmt.Errorf("INVALID_MAX_ATTEMPTS")
	}
	return s.repo.Enqueue(ctx, input)
}

func (s *AutomationService) RerunFailed(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error) {
	if input.MaxAttempts < 1 || input.MaxAttempts > 10 {
		return nil, fmt.Errorf("INVALID_MAX_ATTEMPTS")
	}
	if input.SelectionLimit < 1 || input.SelectionLimit > 500 {
		return nil, fmt.Errorf("INVALID_SELECTION_LIMIT")
	}
	return s.repo.RerunFailed(ctx, input)
}

func (s *AutomationService) JobStatus(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error) {
	return s.repo.JobStatus(ctx, projectID, jobID)
}

func (s *AutomationService) RunnerList(ctx context.Context, projectID string) ([]core.AutomationRunner, error) {
	return s.repo.RunnerList(ctx, projectID)
}
