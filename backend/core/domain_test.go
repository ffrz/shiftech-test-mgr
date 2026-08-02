package core

import (
	"encoding/json"
	"testing"
	"time"
)

func strPtr(s string) *string { return &s }

func TestProjectStatusConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual ProjectStatus
		want   string
	}{
		{"active", ProjectStatusActive, "active"},
		{"inactive", ProjectStatusInactive, "inactive"},
		{"archived", ProjectStatusArchived, "archived"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("ProjectStatus = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestProjectVisibilityConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual ProjectVisibility
		want   string
	}{
		{"private", VisibilityPrivate, "private"},
		{"unlisted", VisibilityUnlisted, "unlisted"},
		{"public", VisibilityPublic, "public"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("ProjectVisibility = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestTestCasePriorityConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual TestCasePriority
		want   string
	}{
		{"low", PriorityLow, "low"},
		{"medium", PriorityMedium, "medium"},
		{"high", PriorityHigh, "high"},
		{"critical", PriorityCritical, "critical"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("TestCasePriority = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestTestCaseStatusConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual TestCaseStatus
		want   string
	}{
		{"active", TestCaseStatusActive, "active"},
		{"archived", TestCaseStatusArchived, "archived"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("TestCaseStatus = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestStepTypeConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual StepType
		want   string
	}{
		{"simple", StepSimple, "simple"},
		{"detailed", StepDetailed, "detailed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("StepType = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestTestRunStatusConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual TestRunStatus
		want   string
	}{
		{"in_progress", RunInProgress, "in_progress"},
		{"completed", RunCompleted, "completed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("TestRunStatus = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestTestResultStatusConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual TestResultStatus
		want   string
	}{
		{"pass", ResultPass, "pass"},
		{"fail", ResultFail, "fail"},
		{"skip", ResultSkip, "skip"},
		{"blocked", ResultBlocked, "blocked"},
		{"not_run", ResultNotRun, "not_run"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("TestResultStatus = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestIssueStatusConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual IssueStatus
		want   string
	}{
		{"open", IssueOpen, "open"},
		{"in_progress", IssueInProgress, "in_progress"},
		{"resolved", IssueResolved, "resolved"},
		{"closed", IssueClosed, "closed"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("IssueStatus = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestIssueTypeConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual IssueType
		want   string
	}{
		{"bug", IssueBug, "bug"},
		{"feature", IssueFeature, "feature"},
		{"improvement", IssueImprovement, "improvement"},
		{"task", IssueTask, "task"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("IssueType = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestTokenScopeConstants(t *testing.T) {
	tests := []struct {
		name   string
		actual TokenScope
		want   string
	}{
		{"read:project", ScopeReadProject, "read:project"},
		{"read:test-cases", ScopeReadTestCase, "read:test-cases"},
		{"read:test-plans", ScopeReadTestPlan, "read:test-plans"},
		{"read:test-runs", ScopeReadTestRun, "read:test-runs"},
		{"read:issues", ScopeReadIssue, "read:issues"},
		{"read:automation", ScopeReadAutomation, "read:automation"},
		{"write:test-cases", ScopeWriteTestCase, "write:test-cases"},
		{"write:test-plans", ScopeWriteTestPlan, "write:test-plans"},
		{"write:test-runs", ScopeWriteTestRun, "write:test-runs"},
		{"write:issues", ScopeWriteIssue, "write:issues"},
		{"write:automation", ScopeWriteAutomation, "write:automation"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.actual) != tt.want {
				t.Errorf("TokenScope = %q, want %q", tt.actual, tt.want)
			}
		})
	}
}

func TestProjectJSON(t *testing.T) {
	now := time.Date(2025, 1, 15, 10, 30, 0, 0, time.UTC)
	p := Project{
		ID:          "proj-1",
		Name:        "Test Project",
		Description: strPtr("A test project"),
		Status:      ProjectStatusActive,
		Visibility:  VisibilityPrivate,
		OwnerID:     "user-1",
		OwnerType:   OwnerTypeUser,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("failed to marshal Project: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("failed to unmarshal into map: %v", err)
	}

	if decoded["id"] != "proj-1" {
		t.Errorf("id = %v, want proj-1", decoded["id"])
	}
	if decoded["name"] != "Test Project" {
		t.Errorf("name = %v, want Test Project", decoded["name"])
	}
	if decoded["status"] != "active" {
		t.Errorf("status = %v, want active", decoded["status"])
	}
	if decoded["visibility"] != "private" {
		t.Errorf("visibility = %v, want private", decoded["visibility"])
	}
	if decoded["ownerId"] != "user-1" {
		t.Errorf("ownerId = %v, want user-1", decoded["ownerId"])
	}
	if decoded["createdAt"] == nil {
		t.Error("createdAt should not be nil")
	}
	if decoded["updatedAt"] == nil {
		t.Error("updatedAt should not be nil")
	}
}

func TestProjectJSONRoundtrip(t *testing.T) {
	now := time.Date(2025, 1, 15, 10, 30, 0, 0, time.UTC)
	p := Project{
		ID:          "proj-1",
		Name:        "Roundtrip Project",
		Description: strPtr("Roundtrip"),
		Status:      ProjectStatusActive,
		Visibility:  VisibilityPublic,
		OwnerID:     "owner-1",
		OwnerType:   OwnerTypeUser,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(p)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var p2 Project
	if err := json.Unmarshal(data, &p2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if p2.ID != p.ID {
		t.Errorf("ID = %q, want %q", p2.ID, p.ID)
	}
	if p2.Name != p.Name {
		t.Errorf("Name = %q, want %q", p2.Name, p.Name)
	}
	if p2.Status != p.Status {
		t.Errorf("Status = %q, want %q", p2.Status, p.Status)
	}
	if p2.Visibility != p.Visibility {
		t.Errorf("Visibility = %q, want %q", p2.Visibility, p.Visibility)
	}
	if p2.OwnerID != p.OwnerID {
		t.Errorf("OwnerID = %q, want %q", p2.OwnerID, p.OwnerID)
	}
}

func TestTestCaseJSONRoundtrip(t *testing.T) {
	now := time.Date(2025, 6, 1, 12, 0, 0, 0, time.UTC)
	tc := TestCase{
		ID:           "tc-1",
		Code:         "TC-001",
		Title:        "Login Test",
		Objective:    strPtr("Verify login flow"),
		Preconditions: strPtr("User exists"),
		Steps:        "1. Open login page\n2. Enter credentials",
		DetailedSteps: []TestCaseStep{
			{ID: "s-1", TestCaseID: "tc-1", StepNumber: 1, Action: "Open login page", ExpectedResult: strPtr("Page loads")},
			{ID: "s-2", TestCaseID: "tc-1", StepNumber: 2, Action: "Enter credentials", ExpectedResult: strPtr("Fields accepted")},
		},
		ExpectedResult: "User is logged in",
		Priority:       PriorityHigh,
		Status:         TestCaseStatusActive,
		StepType:       StepDetailed,
		ModuleID:       strPtr("mod-1"),
		ProjectID:      "proj-1",
		Tags:           []string{"smoke", "regression"},
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	data, err := json.Marshal(tc)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var tc2 TestCase
	if err := json.Unmarshal(data, &tc2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if tc2.ID != tc.ID {
		t.Errorf("ID = %q, want %q", tc2.ID, tc.ID)
	}
	if tc2.Priority != tc.Priority {
		t.Errorf("Priority = %q, want %q", tc2.Priority, tc.Priority)
	}
	if len(tc2.DetailedSteps) != 2 {
		t.Errorf("DetailedSteps len = %d, want 2", len(tc2.DetailedSteps))
	}
	if tc2.DetailedSteps[0].Action != "Open login page" {
		t.Errorf("DetailedSteps[0].Action = %q", tc2.DetailedSteps[0].Action)
	}
	if len(tc2.Tags) != 2 {
		t.Errorf("Tags len = %d, want 2", len(tc2.Tags))
	}
}

func TestTestCaseJSONUsesCamelCase(t *testing.T) {
	tc := TestCase{
		ID:             "tc-1",
		ExpectedResult: "should pass",
		StepType:       StepSimple,
		ModuleID:       strPtr("mod-1"),
		ProjectID:      "proj-1",
	}

	data, err := json.Marshal(tc)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded map[string]interface{}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if _, ok := decoded["expectedResult"]; !ok {
		t.Error("expectedResult field missing (camelCase)")
	}
	if _, ok := decoded["stepType"]; !ok {
		t.Error("stepType field missing (camelCase)")
	}
	if _, ok := decoded["moduleId"]; !ok {
		t.Error("moduleId field missing (camelCase)")
	}
	if _, ok := decoded["projectId"]; !ok {
		t.Error("projectId field missing (camelCase)")
	}
	if _, ok := decoded["expected_result"]; ok {
		t.Error("snake_case expected_result should not appear in JSON")
	}
}

func TestTestRunJSONRoundtrip(t *testing.T) {
	now := time.Date(2025, 7, 1, 9, 0, 0, 0, time.UTC)
	planID := "plan-1"
	tr := TestRun{
		ID:        "run-1",
		Code:      "TR-001",
		Name:      "Sprint 1 Regression",
		Status:    RunInProgress,
		TestPlanID: &planID,
		ProjectID: "proj-1",
		StartedAt: now,
	}

	data, err := json.Marshal(tr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var tr2 TestRun
	if err := json.Unmarshal(data, &tr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if tr2.Status != tr.Status {
		t.Errorf("Status = %q, want %q", tr2.Status, tr.Status)
	}
	if *tr2.TestPlanID != planID {
		t.Errorf("TestPlanID = %q, want %q", *tr2.TestPlanID, planID)
	}
}

func TestTestRunNullableFields(t *testing.T) {
	tr := TestRun{
		ID:         "run-1",
		Name:       "Ad-hoc Run",
		Status:     RunInProgress,
		TestPlanID: nil,
		ProjectID:  "proj-1",
	}

	data, err := json.Marshal(tr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var tr2 TestRun
	if err := json.Unmarshal(data, &tr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if tr2.TestPlanID != nil {
		t.Errorf("TestPlanID should be nil, got %v", tr2.TestPlanID)
	}
	if tr2.CompletedAt != nil {
		t.Errorf("CompletedAt should be nil, got %v", *tr2.CompletedAt)
	}
}

func TestTestResultJSONRoundtrip(t *testing.T) {
	testerID := "tester-1"
	notes := "test passed successfully"
	now := time.Date(2025, 7, 2, 14, 0, 0, 0, time.UTC)
	tr := TestResult{
		ID:         "result-1",
		TestRunID:  "run-1",
		TestCaseID: "tc-1",
		Status:     ResultPass,
		TesterID:   &testerID,
		Notes:      &notes,
		UpdatedAt:  now,
	}

	data, err := json.Marshal(tr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var tr2 TestResult
	if err := json.Unmarshal(data, &tr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if tr2.Status != ResultPass {
		t.Errorf("Status = %q, want pass", tr2.Status)
	}
	if *tr2.TesterID != testerID {
		t.Errorf("TesterID = %q, want %q", *tr2.TesterID, testerID)
	}
	if *tr2.Notes != notes {
		t.Errorf("Notes = %q, want %q", *tr2.Notes, notes)
	}
}

func TestIssueJSONRoundtrip(t *testing.T) {
	now := time.Date(2025, 7, 3, 10, 0, 0, 0, time.UTC)
	modID := "mod-1"
	assigneeID := "user-1"
	issue := Issue{
		ID:          "iss-1",
		Code:        "BUG-001",
		Title:       "Login fails on Firefox",
		Description: strPtr("User cannot log in"),
		Type:        IssueBug,
		Status:      IssueOpen,
		Priority:    IssuePriorityHigh,
		ModuleID:    &modID,
		ProjectID:   "proj-1",
		AssignedTo:  &assigneeID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	data, err := json.Marshal(issue)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var issue2 Issue
	if err := json.Unmarshal(data, &issue2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if issue2.Type != IssueBug {
		t.Errorf("Type = %q, want bug", issue2.Type)
	}
	if issue2.Status != IssueOpen {
		t.Errorf("Status = %q, want open", issue2.Status)
	}
	if issue2.Priority != IssuePriorityHigh {
		t.Errorf("Priority = %q, want high", issue2.Priority)
	}
}

func TestAPITokenIdentityJSONRoundtrip(t *testing.T) {
	id := APITokenIdentity{
		TokenID:   "tok-1",
		ProjectID: "proj-1",
		Scopes:    []TokenScope{ScopeReadProject, ScopeReadTestCase, ScopeWriteTestCase},
	}

	data, err := json.Marshal(id)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var id2 APITokenIdentity
	if err := json.Unmarshal(data, &id2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if id2.TokenID != id.TokenID {
		t.Errorf("TokenID = %q, want %q", id2.TokenID, id.TokenID)
	}
	if len(id2.Scopes) != 3 {
		t.Errorf("Scopes len = %d, want 3", len(id2.Scopes))
	}
	if id2.Scopes[0] != ScopeReadProject {
		t.Errorf("Scopes[0] = %q, want %q", id2.Scopes[0], ScopeReadProject)
	}
}

func TestRunSummaryJSONRoundtrip(t *testing.T) {
	rs := RunSummary{
		Pass:    10,
		Fail:    2,
		Skip:    1,
		Blocked: 0,
		NotRun:  5,
		Total:   18,
	}

	data, err := json.Marshal(rs)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var rs2 RunSummary
	if err := json.Unmarshal(data, &rs2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if rs2.Pass != 10 {
		t.Errorf("Pass = %d, want 10", rs2.Pass)
	}
	if rs2.Fail != 2 {
		t.Errorf("Fail = %d, want 2", rs2.Fail)
	}
	if rs2.Total != 18 {
		t.Errorf("Total = %d, want 18", rs2.Total)
	}
}

func TestPageResultWithProjects(t *testing.T) {
	pr := PageResult[Project]{
		Items: []Project{
			{ID: "p1", Name: "Project 1"},
			{ID: "p2", Name: "Project 2"},
		},
		NextCursor: "cursor-abc",
		HasMore:    true,
		Total:      42,
	}

	data, err := json.Marshal(pr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var pr2 PageResult[Project]
	if err := json.Unmarshal(data, &pr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(pr2.Items) != 2 {
		t.Errorf("Items len = %d, want 2", len(pr2.Items))
	}
	if pr2.Items[0].ID != "p1" {
		t.Errorf("Items[0].ID = %q, want p1", pr2.Items[0].ID)
	}
	if pr2.Total != 42 {
		t.Errorf("Total = %d, want 42", pr2.Total)
	}
	if !pr2.HasMore {
		t.Error("HasMore should be true")
	}
}

func TestPageResultWithIssues(t *testing.T) {
	pr := PageResult[Issue]{
		Items: []Issue{
			{ID: "i1", Title: "Bug 1", Type: IssueBug},
			{ID: "i2", Title: "Feature 1", Type: IssueFeature},
			{ID: "i3", Title: "Task 1", Type: IssueTask},
		},
		NextCursor: "",
		HasMore:    false,
		Total:      3,
	}

	data, err := json.Marshal(pr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var pr2 PageResult[Issue]
	if err := json.Unmarshal(data, &pr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(pr2.Items) != 3 {
		t.Errorf("Items len = %d, want 3", len(pr2.Items))
	}
	if pr2.HasMore {
		t.Error("HasMore should be false")
	}
}

func TestPageResultEmpty(t *testing.T) {
	pr := PageResult[TestRun]{
		Items:      []TestRun{},
		NextCursor: "",
		HasMore:    false,
		Total:      0,
	}

	data, err := json.Marshal(pr)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var pr2 PageResult[TestRun]
	if err := json.Unmarshal(data, &pr2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if len(pr2.Items) != 0 {
		t.Errorf("Items len = %d, want 0", len(pr2.Items))
	}
	if pr2.Total != 0 {
		t.Errorf("Total = %d, want 0", pr2.Total)
	}
}

func TestModuleJSONRoundtrip(t *testing.T) {
	now := time.Date(2025, 3, 1, 8, 0, 0, 0, time.UTC)
	m := Module{
		ID:        "mod-1",
		Name:      "Authentication",
		ProjectID: "proj-1",
		CreatedAt: now,
	}

	data, err := json.Marshal(m)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var m2 Module
	if err := json.Unmarshal(data, &m2); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if m2.ID != m.ID {
		t.Errorf("ID = %q, want %q", m2.ID, m.ID)
	}
	if m2.Name != m.Name {
		t.Errorf("Name = %q, want %q", m2.Name, m.Name)
	}
}
