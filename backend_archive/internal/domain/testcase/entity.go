// Package testcase mirrors the frontend's TestCase domain type
// (frontend/src/types/domain.ts) — the reusable test template, never the
// execution result (that lives in the test_results domain, see
// ARCHITECTURE.md's Domain Model section).
package testcase

import "time"

type Priority string

const (
	PriorityLow      Priority = "low"
	PriorityMedium   Priority = "medium"
	PriorityHigh     Priority = "high"
	PriorityCritical Priority = "critical"
)

type Status string

const (
	StatusActive   Status = "active"
	StatusArchived Status = "archived"
)

// StepType picks which "steps" storage is authoritative for a test case:
// simple keeps free-text steps/expected_result columns, detailed uses the
// child TestCaseStep rows instead (see ARCHITECTURE.md §6.4).
type StepType string

const (
	StepTypeSimple   StepType = "simple"
	StepTypeDetailed StepType = "detailed"
)

// TestCase is the reusable test template — title, objective, steps,
// expected result — and NEVER stores a pass/fail result (that always lives
// in test_results, see CLAUDE.md's "Domain Model" rules).
type TestCase struct {
	ID             string
	ProjectID      string
	ModuleID       *string
	Code           string
	Title          string
	Objective      string
	Preconditions  string
	Steps          string
	ExpectedResult string
	Priority       Priority
	Status         Status
	Notes          string
	StepType       StepType
	TargetRoleID   *string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// TestCaseStep is a template step — only meaningful when the parent
// TestCase.StepType is StepTypeDetailed.
type TestCaseStep struct {
	ID             string
	TestCaseID     string
	StepNumber     int
	Action         string
	ExpectedResult string
}

// WithDetails carries the associated steps + tag IDs alongside the plain
// entity — the frontend's TestCaseWithDetails additionally resolves
// module/tag/role objects, but that resolution is a read-model concern left
// to the DTO layer here since Module/Tag/TestRole CRUD is separate parallel
// work; this layer only needs the raw IDs.
type WithDetails struct {
	TestCase
	Steps  []TestCaseStep
	TagIDs []string
}

// Query mirrors testCaseRepository.ts's filter surface for listing —
// search/status/priority/module/tag all narrow the FindAllByProject result
// set in the database.
type Query struct {
	Search   string
	Status   Status   // empty means "all"
	Priority Priority // empty means "all"
	ModuleID string   // empty means "all"
	TagIDs   []string // any test case tagged with at least one of these
}
