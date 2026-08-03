package service

import (
	"context"
	"fmt"

	"github.com/shiftech/testify-platform/core"
)

// TestCaseService wraps core.TestCaseRepository. Business rules for TestCase
// (e.g. status transitions, tag/module validation) belong here.
type TestCaseService struct {
	repo     core.TestCaseRepository
	activity core.ActivityRepository
}

// NewTestCaseService wires the repository plus the activity repository
// needed to log status_change events on Archive/Reactivate (mirrors
// frontend/src/services/testCaseService.ts archive/reactivate). activity may
// be nil only in tests that never call Archive/Reactivate.
func NewTestCaseService(repo core.TestCaseRepository, activity core.ActivityRepository) *TestCaseService {
	return &TestCaseService{repo: repo, activity: activity}
}

func (s *TestCaseService) List(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
	return s.repo.List(ctx, filter)
}

func (s *TestCaseService) Get(ctx context.Context, id string) (*core.TestCase, error) {
	return s.repo.Get(ctx, id)
}

func (s *TestCaseService) Create(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
	return s.repo.Create(ctx, input)
}

func (s *TestCaseService) Update(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
	return s.repo.Update(ctx, id, input)
}

func (s *TestCaseService) Duplicate(ctx context.Context, id string, newTitle string) (*core.TestCase, error) {
	return s.repo.Duplicate(ctx, id, newTitle)
}

// Archive transitions a test case to archived and logs a status_change
// activity entry (mirrors frontend testCaseService.archive). No-op on the
// activity log if the case is already archived.
func (s *TestCaseService) Archive(ctx context.Context, id, actorID, projectID string) error {
	return s.changeTestCaseStatus(ctx, id, actorID, projectID, core.TestCaseStatusArchived, s.repo.Archive)
}

// Reactivate transitions an archived test case back to active, mirroring
// frontend testCaseService.reactivate.
func (s *TestCaseService) Reactivate(ctx context.Context, id, actorID, projectID string) error {
	return s.changeTestCaseStatus(ctx, id, actorID, projectID, core.TestCaseStatusActive, s.repo.Reactivate)
}

func (s *TestCaseService) changeTestCaseStatus(ctx context.Context, id, actorID, projectID string, to core.TestCaseStatus, apply func(context.Context, string) error) error {
	current, err := s.repo.Get(ctx, id)
	if err != nil {
		return err
	}
	from := current.Status
	if from == to {
		return nil
	}
	if err := apply(ctx, id); err != nil {
		return err
	}
	if err := s.activity.Create(ctx, core.CreateActivityInput{
		ProjectID:  projectID,
		EntityType: "test_case",
		EntityID:   id,
		ActorID:    actorID,
		EventType:  "status_change",
		Payload:    map[string]any{"from": string(from), "to": string(to)},
	}); err != nil {
		return fmt.Errorf("log activity: %w", err)
	}
	return nil
}
