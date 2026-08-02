package postgres

import (
	"testing"
	"time"

	"github.com/shiftech/testify-platform/core"
)

func TestProjectRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 22, 10, 5, 38, 0, time.UTC)
	row := projectRow{
		ID:          "p1",
		Name:        "Amanah POS",
		Description: "Mini ERP",
		Status:      "active",
		Visibility:  "private",
		OwnerID:     "user-1",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	got := row.toDomain()

	want := core.Project{
		ID:          "p1",
		Name:        "Amanah POS",
		Description: "Mini ERP",
		Status:      core.ProjectStatusActive,
		Visibility:  core.VisibilityPrivate,
		OwnerID:     "user-1",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if got != want {
		t.Errorf("toDomain() mismatch:\n got: %+v\nwant: %+v", got, want)
	}
}

func TestProjectRowToDomainAllStatuses(t *testing.T) {
	cases := []struct {
		raw  string
		want core.ProjectStatus
	}{
		{"active", core.ProjectStatusActive},
		{"inactive", core.ProjectStatusInactive},
		{"archived", core.ProjectStatusArchived},
	}
	for _, c := range cases {
		row := projectRow{Status: c.raw, Visibility: "public"}
		if got := row.toDomain().Status; got != c.want {
			t.Errorf("projectRow{Status:%q}.toDomain().Status = %q, want %q", c.raw, got, c.want)
		}
	}
}

func TestProjectRowToDomainVisibility(t *testing.T) {
	cases := []struct {
		raw  string
		want core.ProjectVisibility
	}{
		{"private", core.VisibilityPrivate},
		{"unlisted", core.VisibilityUnlisted},
		{"public", core.VisibilityPublic},
	}
	for _, c := range cases {
		row := projectRow{Status: "active", Visibility: c.raw}
		if got := row.toDomain().Visibility; got != c.want {
			t.Errorf("projectRow{Visibility:%q}.toDomain().Visibility = %q, want %q", c.raw, got, c.want)
		}
	}
}

func TestModuleRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)
	row := moduleRow{
		ID:        "m1",
		ProjectID: "p1",
		Code:      "MOD-001",
		Name:      "Authentication",
		CreatedAt: now,
		UpdatedAt: now,
	}
	got := row.toDomain()

	if got.ID != "m1" || got.Name != "Authentication" || got.ProjectID != "p1" {
		t.Errorf("toDomain() mismatch: got %+v", got)
	}
	if !got.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt = %v, want %v", got.CreatedAt, now)
	}
}

func TestTagRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 2, 0, 0, 0, 0, time.UTC)
	row := tagRow{
		ID:        "t1",
		ProjectID: "p1",
		Name:      "smoke",
		CreatedAt: now,
	}
	got := row.toDomain()

	if got.ID != "t1" || got.Name != "smoke" || got.ProjectID != "p1" {
		t.Errorf("toDomain() mismatch: got %+v", got)
	}
	if !got.CreatedAt.Equal(now) {
		t.Errorf("CreatedAt = %v, want %v", got.CreatedAt, now)
	}
}

func TestTestRoleRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 3, 0, 0, 0, 0, time.UTC)
	row := testRoleRow{
		ID:        "r1",
		ProjectID: "p1",
		Name:      "QA Engineer",
		CreatedAt: now,
		UpdatedAt: now,
	}
	got := row.toDomain()

	if got.ID != "r1" || got.Name != "QA Engineer" || got.ProjectID != "p1" {
		t.Errorf("toDomain() mismatch: got %+v", got)
	}
	if !got.CreatedAt.Equal(now) || !got.UpdatedAt.Equal(now) {
		t.Errorf("timestamps mismatch: %+v", got)
	}
}

func TestTestCaseRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 4, 0, 0, 0, 0, time.UTC)
	moduleID := "m1"
	row := testCaseRow{
		ID:             "tc1",
		ProjectID:      "p1",
		Code:           "TC-001",
		Title:          "Login test",
		Objective:      "Verify login",
		Preconditions:  "User exists",
		Steps:          "simple",
		ExpectedResult: "Logged in",
		Priority:       "high",
		Status:         "active",
		ModuleID:       &moduleID,
		StepType:       "simple",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	got := row.toDomain()

	want := core.TestCase{
		ID:             "tc1",
		Code:           "TC-001",
		Title:          "Login test",
		Objective:      "Verify login",
		Precondition:   "User exists",
		ExpectedResult: "Logged in",
		Priority:       core.PriorityHigh,
		Status:         core.TestCaseStatusActive,
		StepType:       core.StepSimple,
		ProjectID:      "p1",
		ModuleID:       "m1",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if got.ID != want.ID || got.Code != want.Code || got.Title != want.Title ||
		got.Objective != want.Objective || got.Precondition != want.Precondition ||
		got.ExpectedResult != want.ExpectedResult || got.Priority != want.Priority ||
		got.Status != want.Status || got.StepType != want.StepType ||
		got.ProjectID != want.ProjectID || got.ModuleID != want.ModuleID ||
		!got.CreatedAt.Equal(want.CreatedAt) || !got.UpdatedAt.Equal(want.UpdatedAt) {
		t.Errorf("toDomain() mismatch:\n got: %+v\nwant: %+v", got, want)
	}
}

func TestTestCaseRowToDomainNilModule(t *testing.T) {
	row := testCaseRow{
		ID:        "tc1",
		ProjectID: "p1",
		Code:      "TC-001",
		ModuleID:  nil,
		StepType:  "detailed",
		Priority:  "low",
		Status:    "archived",
	}
	got := row.toDomain()
	if got.ModuleID != "" {
		t.Errorf("ModuleID = %q, want empty string for nil module", got.ModuleID)
	}
	if got.StepType != core.StepDetailed {
		t.Errorf("StepType = %q, want detailed", got.StepType)
	}
	if got.Status != core.TestCaseStatusArchived {
		t.Errorf("Status = %q, want archived", got.Status)
	}
}

func TestTestCaseStepRowToDomain(t *testing.T) {
	expected := "Page loads"
	row := testCaseStepRow{
		ID:             "s1",
		TestCaseID:     "tc1",
		StepNumber:     2,
		Action:         "Open login page",
		ExpectedResult: &expected,
		CreatedAt:      time.Now(),
	}
	got := row.toDomain()

	if got.ID != "s1" {
		t.Errorf("ID = %q, want s1", got.ID)
	}
	if got.TestCasedID != "tc1" {
		t.Errorf("TestCasedID = %q, want tc1", got.TestCasedID)
	}
	if got.Order != 2 {
		t.Errorf("Order = %d, want 2", got.Order)
	}
	if got.Action != "Open login page" {
		t.Errorf("Action = %q", got.Action)
	}
	if got.Expectation != expected {
		t.Errorf("Expectation = %q, want %q", got.Expectation, expected)
	}
}

func TestTestCaseStepRowToDomainNilExpected(t *testing.T) {
	row := testCaseStepRow{
		ID:             "s1",
		TestCaseID:     "tc1",
		StepNumber:     1,
		Action:         "Click button",
		ExpectedResult: nil,
	}
	got := row.toDomain()
	if got.Expectation != "" {
		t.Errorf("Expectation = %q, want empty string for nil expected result", got.Expectation)
	}
}

func TestTestPlanRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 5, 0, 0, 0, 0, time.UTC)
	row := testPlanRow{
		ID:          "plan1",
		ProjectID:   "p1",
		Code:        "PLAN-001",
		Name:        "Sprint 1",
		Description: "Regression",
		Status:      "active",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	got := row.toDomain()

	want := core.TestPlan{
		ID:          "plan1",
		Code:        "PLAN-001",
		Name:        "Sprint 1",
		Description: "Regression",
		Status:      core.PlanActive,
		ProjectID:   "p1",
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if got.ID != want.ID || got.Code != want.Code || got.Name != want.Name ||
		got.Description != want.Description || got.Status != want.Status ||
		got.ProjectID != want.ProjectID ||
		!got.CreatedAt.Equal(want.CreatedAt) || !got.UpdatedAt.Equal(want.UpdatedAt) {
		t.Errorf("toDomain() mismatch:\n got: %+v\nwant: %+v", got, want)
	}
}

func TestTestPlanRowToDomainStatuses(t *testing.T) {
	cases := []struct {
		raw  string
		want core.TestPlanStatus
	}{
		{"draft", core.PlanDraft},
		{"active", core.PlanActive},
		{"completed", core.PlanCompleted},
		{"archived", core.PlanArchived},
	}
	for _, c := range cases {
		row := testPlanRow{Status: c.raw}
		if got := row.toDomain().Status; got != c.want {
			t.Errorf("testPlanRow{Status:%q}.toDomain().Status = %q, want %q", c.raw, got, c.want)
		}
	}
}

func TestTestRunRowToDomain(t *testing.T) {
	started := time.Date(2026, 7, 6, 9, 30, 0, 0, time.UTC)
	planID := "plan1"
	row := testRunRow{
		ID:          "run1",
		ProjectID:   "p1",
		PlanID:      &planID,
		Name:        "Sprint 1 Run",
		Code:        "TR-001",
		Status:      "in_progress",
		StartedAt:   started,
		CompletedAt: nil,
		CreatedAt:   started,
		UpdatedAt:   started,
	}
	got := row.toDomain()

	want := core.TestRun{
		ID:          "run1",
		Code:        "TR-001",
		Name:        "Sprint 1 Run",
		Status:      core.RunInProgress,
		PlanID:      &planID,
		ProjectID:   "p1",
		StartedAt:   started,
		CompletedAt: nil,
	}
	if got != want {
		t.Errorf("toDomain() mismatch:\n got: %+v\nwant: %+v", got, want)
	}
}

func TestTestRunRowToDomainNilPlanAndCompleted(t *testing.T) {
	started := time.Date(2026, 7, 7, 10, 0, 0, 0, time.UTC)
	completed := time.Date(2026, 7, 7, 11, 0, 0, 0, time.UTC)
	row := testRunRow{
		ID:          "run2",
		ProjectID:   "p1",
		PlanID:      nil,
		Name:        "Ad-hoc",
		Code:        "TR-002",
		Status:      "completed",
		StartedAt:   started,
		CompletedAt: &completed,
	}
	got := row.toDomain()

	if got.PlanID != nil {
		t.Errorf("PlanID = %v, want nil", *got.PlanID)
	}
	if got.CompletedAt == nil || !got.CompletedAt.Equal(completed) {
		t.Errorf("CompletedAt = %v, want %v", got.CompletedAt, completed)
	}
	if got.Status != core.RunCompleted {
		t.Errorf("Status = %q, want completed", got.Status)
	}
}

func TestTestResultRowToDomain(t *testing.T) {
	testerID := "tester1"
	notes := "looks good"
	executed := time.Date(2026, 7, 8, 14, 0, 0, 0, time.UTC)
	row := testResultRow{
		ID:         "res1",
		TestRunID:  "run1",
		TestCaseID: "tc1",
		TesterID:   &testerID,
		Status:     "pass",
		ExecutedAt: &executed,
		Notes:      &notes,
		CreatedAt:  executed,
		UpdatedAt:  executed,
	}
	got := row.toDomain()

	if got.ID != "res1" || got.RunID != "run1" || got.CaseID != "tc1" {
		t.Errorf("ID/RunID/CaseID mismatch: %+v", got)
	}
	if got.Status != core.ResultPass {
		t.Errorf("Status = %q, want pass", got.Status)
	}
	if got.TesterID == nil || *got.TesterID != testerID {
		t.Errorf("TesterID = %v, want %q", got.TesterID, testerID)
	}
	if got.Notes == nil || *got.Notes != notes {
		t.Errorf("Notes = %v, want %q", got.Notes, notes)
	}
	if !got.UpdatedAt.Equal(executed) {
		t.Errorf("UpdatedAt = %v, want %v", got.UpdatedAt, executed)
	}
}

func TestTestResultRowToDomainNilPointers(t *testing.T) {
	row := testResultRow{
		ID:         "res2",
		TestRunID:  "run1",
		TestCaseID: "tc1",
		Status:     "not_run",
		TesterID:   nil,
		Notes:      nil,
	}
	got := row.toDomain()
	if got.Status != core.ResultNotRun {
		t.Errorf("Status = %q, want not_run", got.Status)
	}
	if got.TesterID != nil {
		t.Errorf("TesterID = %v, want nil", got.TesterID)
	}
	if got.Notes != nil {
		t.Errorf("Notes = %v, want nil", got.Notes)
	}
}

func TestIssueRowToDomain(t *testing.T) {
	now := time.Date(2026, 7, 30, 6, 17, 2, 0, time.UTC)
	moduleID := "m1"
	assignee := "user1"
	row := issueRow{
		ID:          "iss1",
		ProjectID:   "p1",
		Code:        "ISS-0009",
		Title:       "Icon issue",
		Description: "",
		Type:        "improvement",
		Status:      "open",
		Priority:    "medium",
		ModuleID:    &moduleID,
		AssignedTo:  &assignee,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	got := row.toDomain()

	want := core.Issue{
		ID:          "iss1",
		Code:        "ISS-0009",
		Title:       "Icon issue",
		Description: "",
		Type:        core.IssueImprovement,
		Status:      core.IssueOpen,
		Priority:    core.PriorityMedium,
		ModuleID:    &moduleID,
		ProjectID:   "p1",
		AssigneeID:  &assignee,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if got != want {
		t.Errorf("toDomain() mismatch:\n got: %+v\nwant: %+v", got, want)
	}
}

func TestIssueRowToDomainNilPointers(t *testing.T) {
	row := issueRow{
		ID:         "iss2",
		ProjectID:  "p1",
		Code:       "ISS-0010",
		Title:      "No assignee",
		Type:       "bug",
		Status:     "backlog",
		Priority:   "high",
		ModuleID:   nil,
		AssignedTo: nil,
	}
	got := row.toDomain()
	if got.ModuleID != nil {
		t.Errorf("ModuleID = %v, want nil", got.ModuleID)
	}
	if got.AssigneeID != nil {
		t.Errorf("AssigneeID = %v, want nil", got.AssigneeID)
	}
	if got.Type != core.IssueBug {
		t.Errorf("Type = %q, want bug", got.Type)
	}
	if got.Status != core.IssueBacklog {
		t.Errorf("Status = %q, want backlog", got.Status)
	}
}
