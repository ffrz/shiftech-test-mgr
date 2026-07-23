package testplan

import (
	"context"

	"github.com/shiftech/testmgr-backend/internal/domain/testplan"
)

// Repository is the persistence port for TestPlan and its Case junction.
type Repository interface {
	FindAllByProject(ctx context.Context, projectID string) ([]testplan.TestPlan, error)
	FindByID(ctx context.Context, id string) (*testplan.TestPlan, error)
	Create(ctx context.Context, p *testplan.TestPlan) error
	Update(ctx context.Context, p *testplan.TestPlan) error
	Delete(ctx context.Context, id string) error

	FindCases(ctx context.Context, testPlanID string) ([]testplan.Case, error)
	FindCaseByID(ctx context.Context, id string) (*testplan.Case, error)
	AddCase(ctx context.Context, c *testplan.Case) error
	RemoveCase(ctx context.Context, id string) error
	// ReorderCases rewrites the whole order array for the given plan --
	// each id in orderedCaseIDs receives its index as its new Order, matching
	// the frontend's testCaseRepository.reorderCases semantics.
	ReorderCases(ctx context.Context, orderedCaseIDs []string) error
}
