package testcase

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/testcase"
)

type Repository interface {
	FindAllByProject(ctx context.Context, projectID string, query testcase.Query) ([]testcase.TestCase, error)
	// FindByID returns the test case together with its steps and tag IDs —
	// mirrors testCaseRepository.ts's findByIdWithDetails, minus the
	// module/tag/role object resolution (separate parallel work, see task
	// constraints).
	FindByID(ctx context.Context, id string) (*testcase.WithDetails, error)
	Create(ctx context.Context, tc *testcase.TestCase) error
	Update(ctx context.Context, tc *testcase.TestCase) error
	Delete(ctx context.Context, id string) error

	// ReplaceSteps performs a full delete-all-then-insert-renumbered
	// replacement, matching testCaseStepRepository.ts's replaceForTestCase.
	ReplaceSteps(ctx context.Context, testCaseID string, steps []StepInput) ([]testcase.TestCaseStep, error)

	// SaveTags performs a full delete-all-then-insert replacement of the
	// test_case_tags junction rows for the given tag IDs — the resolution of
	// tag names to IDs (find-or-create) is a Tag-module concern, out of
	// scope here (see task constraints); this only persists the final ID set.
	SaveTags(ctx context.Context, testCaseID string, tagIDs []string) error
}

// StepInput is the pre-validated (trimmed, action non-empty) shape a step
// replacement call takes — mirrors testCaseStepService.ts's cleaned shape.
type StepInput struct {
	Action         string
	ExpectedResult string
}
