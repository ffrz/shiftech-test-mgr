package tools

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// ---------------------------------------------------------------------------
// mock repos (same style as service/service_test.go)
// ---------------------------------------------------------------------------

type writeMockTestCaseRepo struct {
	get       func(ctx context.Context, id string) (*core.TestCase, error)
	create    func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error)
	update    func(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error)
	duplicate func(ctx context.Context, id, newTitle string) (*core.TestCase, error)
	archive   func(ctx context.Context, id string) error
}

func (m *writeMockTestCaseRepo) List(ctx context.Context, filter core.TestCaseFilter) (*core.PageResult[core.TestCase], error) {
	return nil, errors.New("not used")
}
func (m *writeMockTestCaseRepo) Get(ctx context.Context, id string) (*core.TestCase, error) {
	return m.get(ctx, id)
}
func (m *writeMockTestCaseRepo) Create(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
	return m.create(ctx, input)
}
func (m *writeMockTestCaseRepo) Update(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
	return m.update(ctx, id, input)
}
func (m *writeMockTestCaseRepo) Duplicate(ctx context.Context, id, newTitle string) (*core.TestCase, error) {
	return m.duplicate(ctx, id, newTitle)
}
func (m *writeMockTestCaseRepo) Archive(ctx context.Context, id string) error {
	return m.archive(ctx, id)
}

type writeMockTestPlanRepo struct {
	get         func(ctx context.Context, id string) (*core.TestPlan, error)
	create      func(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error)
	addCases    func(ctx context.Context, planID string, caseIDs []string) error
	removeCases func(ctx context.Context, planID string, caseIDs []string) error
	approve     func(ctx context.Context, id, approverID string) error
}

func (m *writeMockTestPlanRepo) List(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
	return nil, errors.New("not used")
}
func (m *writeMockTestPlanRepo) Get(ctx context.Context, id string) (*core.TestPlan, error) {
	return m.get(ctx, id)
}
func (m *writeMockTestPlanRepo) Create(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
	return m.create(ctx, input)
}
func (m *writeMockTestPlanRepo) AddCases(ctx context.Context, planID string, caseIDs []string) error {
	return m.addCases(ctx, planID, caseIDs)
}
func (m *writeMockTestPlanRepo) RemoveCases(ctx context.Context, planID string, caseIDs []string) error {
	return m.removeCases(ctx, planID, caseIDs)
}
func (m *writeMockTestPlanRepo) Approve(ctx context.Context, id, approverID string) error {
	return m.approve(ctx, id, approverID)
}

type writeMockTestRunRepo struct {
	get          func(ctx context.Context, id string) (*core.TestRun, error)
	create       func(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error)
	recordResult func(ctx context.Context, resultID string, input core.RecordResultInput) error
	complete     func(ctx context.Context, id string) error
}

func (m *writeMockTestRunRepo) List(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error) {
	return nil, errors.New("not used")
}
func (m *writeMockTestRunRepo) Get(ctx context.Context, id string) (*core.TestRun, error) {
	return m.get(ctx, id)
}
func (m *writeMockTestRunRepo) Create(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
	return m.create(ctx, input)
}
func (m *writeMockTestRunRepo) RecordResult(ctx context.Context, resultID string, input core.RecordResultInput) error {
	return m.recordResult(ctx, resultID, input)
}
func (m *writeMockTestRunRepo) Complete(ctx context.Context, id string) error {
	return m.complete(ctx, id)
}
func (m *writeMockTestRunRepo) Summary(ctx context.Context, id string) (*core.RunSummary, error) {
	return nil, errors.New("not used")
}

type writeMockIssueRepo struct {
	get          func(ctx context.Context, id string) (*core.Issue, error)
	create       func(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error)
	updateStatus func(ctx context.Context, id string, status core.IssueStatus) error
}

func (m *writeMockIssueRepo) List(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
	return nil, errors.New("not used")
}
func (m *writeMockIssueRepo) Get(ctx context.Context, id string) (*core.Issue, error) {
	return m.get(ctx, id)
}
func (m *writeMockIssueRepo) Create(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
	return m.create(ctx, input)
}
func (m *writeMockIssueRepo) UpdateStatus(ctx context.Context, id string, status core.IssueStatus) error {
	return m.updateStatus(ctx, id, status)
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const (
	testProjectID = "123e4567-e89b-12d3-a456-426614174000"
	testApprover  = "123e4567-e89b-12d3-a456-426614174001"
	testCaseID    = "123e4567-e89b-12d3-a456-426614174002"
	testPlanID    = "123e4567-e89b-12d3-a456-426614174003"
	testRunID     = "123e4567-e89b-12d3-a456-426614174004"
	testResultID  = "123e4567-e89b-12d3-a456-426614174005"
	testIssueID   = "123e4567-e89b-12d3-a456-426614174006"
)

func writeSession(scopes ...core.TokenScope) *auth.Session {
	return &auth.Session{
		Identity: core.APITokenIdentity{
			TokenID:   "tok-1",
			ProjectID: testProjectID,
			Scopes:    scopes,
		},
		ProjectID: testProjectID,
	}
}

func allWriteScopes() []core.TokenScope {
	return []core.TokenScope{
		core.ScopeWriteTestCase, core.ScopeWriteTestPlan, core.ScopeWriteTestRun, core.ScopeWriteIssue,
	}
}

// writeReg builds a Registry whose services are backed by the given mocks.
// Any nil service field is left nil; tests must wire only what they call.
func writeReg(session *auth.Session, tc *writeMockTestCaseRepo, tp *writeMockTestPlanRepo, tr *writeMockTestRunRepo, iss *writeMockIssueRepo) *Registry {
	reg := &Registry{Session: session}
	if tc != nil {
		reg.Services.TestCase = service.NewTestCaseService(tc)
	}
	if tp != nil {
		reg.Services.TestPlan = service.NewTestPlanService(tp)
	}
	if tr != nil {
		reg.Services.TestRun = service.NewTestRunService(tr)
	}
	if iss != nil {
		reg.Services.Issue = service.NewIssueService(iss)
	}
	return reg
}

func call(name string, args map[string]any) mcp.CallToolRequest {
	return mcp.CallToolRequest{
		Params: mcp.CallToolParams{Name: name, Arguments: args},
	}
}

func assertErrorResult(t *testing.T, name string, res *mcp.CallToolResult, wantSubstr string) {
	t.Helper()
	if res == nil {
		t.Fatalf("%s: nil result, want error", name)
	}
	if !res.IsError {
		t.Fatalf("%s: expected IsError=true, got success", name)
	}
	text := resultText(t, res)
	if wantSubstr != "" && !strings.Contains(text, wantSubstr) {
		t.Errorf("%s: error text %q does not contain %q", name, text, wantSubstr)
	}
}

func resultText(t *testing.T, res *mcp.CallToolResult) string {
	t.Helper()
	for _, c := range res.Content {
		if tc, ok := c.(mcp.TextContent); ok {
			return tc.Text
		}
	}
	return ""
}

// ---------------------------------------------------------------------------
// testplan.approve — human gate (TASKS.md T4.1 acceptance)
// ---------------------------------------------------------------------------

func TestApproveTestPlan_RejectsWithoutExplicitApproval(t *testing.T) {
	approved := false
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
		approve: func(ctx context.Context, id, approverID string) error {
			approved = true
			return nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	base := map[string]any{
		"project_id":  testProjectID,
		"testplan_id": testPlanID,
		"approver_id": testApprover,
	}

	cases := []struct {
		name string
		args map[string]any
	}{
		{"missing explicit_approval", map[string]any{}},
		{"explicit_approval false", map[string]any{"explicit_approval": false}},
		{"explicit_approval string true", map[string]any{"explicit_approval": "true"}},
		{"explicit_approval number", map[string]any{"explicit_approval": 1}},
	}
	for _, c := range cases {
		args := map[string]any{}
		for k, v := range base {
			args[k] = v
		}
		for k, v := range c.args {
			args[k] = v
		}
		res, _ := w.approveTestPlan(context.Background(), call("testify.testplan.approve", args))
		assertErrorResult(t, c.name, res, "explicit_approval")
		if approved {
			t.Fatalf("%s: approve must not have been called", c.name)
		}
	}
}

func TestApproveTestPlan_WithExplicitApproval(t *testing.T) {
	approved := false
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
		approve: func(ctx context.Context, id, approverID string) error {
			approved = true
			return nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.approveTestPlan(context.Background(), call("testify.testplan.approve", map[string]any{
		"project_id":        testProjectID,
		"testplan_id":       testPlanID,
		"approver_id":       testApprover,
		"explicit_approval": true,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if !approved {
		t.Fatal("approve was not called")
	}
}

// ---------------------------------------------------------------------------
// scope gating
// ---------------------------------------------------------------------------

func TestWriteTools_RejectMissingScope(t *testing.T) {
	session := writeSession(core.ScopeWriteTestCase) // no test-plan scope
	reg := writeReg(session, nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.approveTestPlan(context.Background(), call("testify.testplan.approve", map[string]any{
		"testplan_id":       testPlanID,
		"approver_id":       testApprover,
		"explicit_approval": true,
	}))
	assertErrorResult(t, "missing scope", res, "missing scope")
}

// ---------------------------------------------------------------------------
// project reference assertion
// ---------------------------------------------------------------------------

func TestWriteTools_RejectProjectMismatch(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: testCaseID, ProjectID: input.ProjectID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"project_id": "99999999-9999-9999-9999-999999999999",
		"cases": []any{
			map[string]any{"title": "T"},
		},
	}))
	assertErrorResult(t, "project mismatch", res, "project")
}

func TestWriteTools_ProjectRefInNestedObject(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: testCaseID, ProjectID: input.ProjectID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	// project_id nested inside a case object must also be checked
	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"cases": []any{
			map[string]any{"title": "T", "project_id": "99999999-9999-9999-9999-999999999999"},
		},
	}))
	assertErrorResult(t, "nested project mismatch", res, "project")
}

// ---------------------------------------------------------------------------
// testcase.createBulk — batch validation
// ---------------------------------------------------------------------------

func TestCreateTestCases_ReturnsReviewOnlyDraft(t *testing.T) {
	created := 0
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			created++
			return &core.TestCase{ID: testCaseID, ProjectID: input.ProjectID, Title: input.Title}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"project_id": testProjectID,
		"cases": []any{
			map[string]any{"title": "Case A", "priority": "high"},
			map[string]any{"title": "Case B"},
		},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if created != 2 {
		t.Errorf("created = %d, want 2", created)
	}
	env, ok := res.StructuredContent.(map[string]any)
	if !ok {
		t.Fatalf("StructuredContent = %T, want map", res.StructuredContent)
	}
	if env["status"] != "draft" || env["mode"] != "review_only" {
		t.Errorf("envelope = %+v, want status=draft mode=review_only", env)
	}
}

func TestCreateTestCases_RejectsOverLimit(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: testCaseID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	cases := make([]any, 101)
	for i := range cases {
		cases[i] = map[string]any{"title": "T"}
	}
	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"cases": cases,
	}))
	assertErrorResult(t, "over limit", res, "100")
}

func TestCreateTestCases_RejectsEmptyTitle(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: testCaseID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"cases": []any{map[string]any{"title": ""}},
	}))
	assertErrorResult(t, "empty title", res, "title")
}

func TestCreateTestCases_RejectsInvalidPriority(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		create: func(ctx context.Context, input core.CreateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: testCaseID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"cases": []any{map[string]any{"title": "T", "priority": "urgent"}},
	}))
	assertErrorResult(t, "invalid priority", res, "priority")
}

func TestCreateTestCases_RejectsNonArray(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestCases(context.Background(), call("testify.testcase.createBulk", map[string]any{
		"cases": "not-an-array",
	}))
	assertErrorResult(t, "non-array", res, "cases")
}

// ---------------------------------------------------------------------------
// UUID array argument helper
// ---------------------------------------------------------------------------

func TestRequireUUIDSlice(t *testing.T) {
	good := []any{testCaseID, testPlanID}
	got, err := requireUUIDSlice(good, "testcase_ids")
	if err != nil {
		t.Fatalf("requireUUIDSlice: %v", err)
	}
	if len(got) != 2 || got[0] != testCaseID || got[1] != testPlanID {
		t.Errorf("requireUUIDSlice = %v", got)
	}

	if _, err := requireUUIDSlice("nope", "testcase_ids"); err == nil {
		t.Error("expected error for non-array")
	}
	if _, err := requireUUIDSlice([]any{"not-a-uuid"}, "testcase_ids"); err == nil {
		t.Error("expected error for non-UUID item")
	}
	if _, err := requireUUIDSlice([]any{testCaseID, 42}, "testcase_ids"); err == nil {
		t.Error("expected error for non-string item")
	}
}

// ---------------------------------------------------------------------------
// testrun.recordResult — status validation
// ---------------------------------------------------------------------------

func TestRecordTestResult_RejectsInvalidStatus(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.recordTestResult(context.Background(), call("testify.testrun.recordResult", map[string]any{
		"result_id": testResultID,
		"status":    "passed",
		"tester_id": testApprover,
	}))
	assertErrorResult(t, "invalid status", res, "status")
}

func TestRecordTestResult_ValidStatusPassesThrough(t *testing.T) {
	got := core.TestResultStatus("")
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{
		recordResult: func(ctx context.Context, resultID string, input core.RecordResultInput) error {
			got = input.Status
			return nil
		},
	}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.recordTestResult(context.Background(), call("testify.testrun.recordResult", map[string]any{
		"result_id": testResultID,
		"status":    "fail",
		"tester_id": testApprover,
		"notes":     "flaky",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got != core.ResultFail {
		t.Errorf("status = %q, want fail", got)
	}
}

// ---------------------------------------------------------------------------
// issue.create — required test_result_id
// ---------------------------------------------------------------------------

func TestCreateIssue_RequiresTestResultID(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, nil, &writeMockIssueRepo{
		create: func(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
			return &core.Issue{ID: testIssueID}, nil
		},
	})
	w := &WriteTools{reg: reg}

	res, _ := w.createIssue(context.Background(), call("testify.issue.create", map[string]any{
		"title": "Bug",
	}))
	assertErrorResult(t, "missing test_result_id", res, "test_result_id")
}

func TestCreateIssue_ValidInput(t *testing.T) {
	var got core.CreateIssueInput
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, nil, &writeMockIssueRepo{
		create: func(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
			got = input
			return &core.Issue{ID: testIssueID, ProjectID: input.ProjectID}, nil
		},
	})
	w := &WriteTools{reg: reg}

	res, _ := w.createIssue(context.Background(), call("testify.issue.create", map[string]any{
		"test_result_id": testResultID,
		"title":          "Bug",
		"type":           "bug",
		"priority":       "critical",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.ProjectID != testProjectID || got.TestResultID != testResultID {
		t.Errorf("input = %+v", got)
	}
	if got.Type != core.IssueBug || got.Priority != core.IssuePriorityCritical {
		t.Errorf("type/priority = %q/%q", got.Type, got.Priority)
	}
}

// ---------------------------------------------------------------------------
// testcase.update / duplicate / archive — project-scoped guard
// ---------------------------------------------------------------------------

func TestUpdateTestCase_ScopedProjectGuard(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		update: func(ctx context.Context, id string, input core.UpdateTestCaseInput) (*core.TestCase, error) {
			return &core.TestCase{ID: id, ProjectID: testProjectID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.updateTestCase(context.Background(), call("testify.testcase.update", map[string]any{
		"testcase_id": testCaseID,
		"title":       "New title",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
}

func TestArchiveTestCase_ScopedProjectGuard(t *testing.T) {
	archived := false
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		get: func(ctx context.Context, id string) (*core.TestCase, error) {
			return &core.TestCase{ID: id, ProjectID: testProjectID}, nil
		},
		archive: func(ctx context.Context, id string) error {
			archived = true
			return nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.archiveTestCase(context.Background(), call("testify.testcase.archive", map[string]any{
		"testcase_id": testCaseID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if !archived {
		t.Fatal("archive was not called")
	}
}

// ---------------------------------------------------------------------------
// testcase.duplicate
// ---------------------------------------------------------------------------

func TestDuplicateTestCase(t *testing.T) {
	gotTitle := ""
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{
		duplicate: func(ctx context.Context, id, newTitle string) (*core.TestCase, error) {
			gotTitle = newTitle
			return &core.TestCase{ID: id, ProjectID: testProjectID}, nil
		},
	}, nil, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.duplicateTestCase(context.Background(), call("testify.testcase.duplicate", map[string]any{
		"testcase_id": testCaseID,
		"new_title":   "Copy of T",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotTitle != "Copy of T" {
		t.Errorf("new_title = %q", gotTitle)
	}
}

func TestDuplicateTestCase_RejectsInvalidID(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), &writeMockTestCaseRepo{}, nil, nil, nil)
	w := &WriteTools{reg: reg}
	res, _ := w.duplicateTestCase(context.Background(), call("testify.testcase.duplicate", map[string]any{
		"testcase_id": "nope",
	}))
	assertErrorResult(t, "invalid id", res, "testcase_id")
}

// ---------------------------------------------------------------------------
// testplan.create
// ---------------------------------------------------------------------------

func TestCreateTestPlan(t *testing.T) {
	var got core.CreateTestPlanInput
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		create: func(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
			got = input
			return &core.TestPlan{ID: testPlanID, ProjectID: input.ProjectID, Name: input.Name}, nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestPlan(context.Background(), call("testify.testplan.create", map[string]any{
		"name": "Release 2.1",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.ProjectID != testProjectID || got.Name != "Release 2.1" || got.Status != core.PlanDraft {
		t.Errorf("input = %+v", got)
	}
}

func TestCreateTestPlan_RequiresName(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{}, nil, nil)
	w := &WriteTools{reg: reg}
	res, _ := w.createTestPlan(context.Background(), call("testify.testplan.create", map[string]any{}))
	assertErrorResult(t, "missing name", res, "name")
}

// ---------------------------------------------------------------------------
// testplan.addCases / removeCases — UUID array + scope guard
// ---------------------------------------------------------------------------

func TestAddTestPlanCases(t *testing.T) {
	var gotPlan string
	var gotIDs []string
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
		addCases: func(ctx context.Context, planID string, caseIDs []string) error {
			gotPlan = planID
			gotIDs = caseIDs
			return nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.addTestPlanCases(context.Background(), call("testify.testplan.addCases", map[string]any{
		"testplan_id":  testPlanID,
		"testcase_ids": []any{testCaseID, testRunID},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotPlan != testPlanID || len(gotIDs) != 2 {
		t.Errorf("addCases got plan=%q ids=%v", gotPlan, gotIDs)
	}
}

func TestAddTestPlanCases_RejectsBadID(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.addTestPlanCases(context.Background(), call("testify.testplan.addCases", map[string]any{
		"testplan_id":  testPlanID,
		"testcase_ids": []any{"not-a-uuid"},
	}))
	assertErrorResult(t, "bad id", res, "testcase_ids")
}

func TestAddTestPlanCases_RejectsOverLimit(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	ids := make([]any, 101)
	for i := range ids {
		ids[i] = testCaseID
	}
	res, _ := w.addTestPlanCases(context.Background(), call("testify.testplan.addCases", map[string]any{
		"testplan_id":  testPlanID,
		"testcase_ids": ids,
	}))
	assertErrorResult(t, "over limit", res, "100")
}

func TestRemoveTestPlanCases(t *testing.T) {
	var gotIDs []string
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: testProjectID}, nil
		},
		removeCases: func(ctx context.Context, planID string, caseIDs []string) error {
			gotIDs = caseIDs
			return nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.removeTestPlanCases(context.Background(), call("testify.testplan.removeCases", map[string]any{
		"testplan_id":  testPlanID,
		"testcase_ids": []any{testCaseID},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if len(gotIDs) != 1 || gotIDs[0] != testCaseID {
		t.Errorf("removeCases ids = %v", gotIDs)
	}
}

func TestRemoveTestPlanCases_ScopedGuard(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, &writeMockTestPlanRepo{
		get: func(ctx context.Context, id string) (*core.TestPlan, error) {
			return &core.TestPlan{ID: id, ProjectID: "99999999-9999-9999-9999-999999999999"}, nil
		},
	}, nil, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.removeTestPlanCases(context.Background(), call("testify.testplan.removeCases", map[string]any{
		"testplan_id":  testPlanID,
		"testcase_ids": []any{testCaseID},
	}))
	assertErrorResult(t, "scoped guard", res, "test plan not found")
}

// ---------------------------------------------------------------------------
// testrun.create — plan or unplanned case set
// ---------------------------------------------------------------------------

func TestCreateTestRun_WithPlan(t *testing.T) {
	var got core.CreateTestRunInput
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{
		create: func(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
			got = input
			return &core.TestRun{ID: testRunID, ProjectID: input.ProjectID}, nil
		},
	}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestRun(context.Background(), call("testify.testrun.create", map[string]any{
		"name":        "Run A",
		"testplan_id": testPlanID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.ProjectID != testProjectID || got.Name != "Run A" || got.TestPlanID == nil || *got.TestPlanID != testPlanID {
		t.Errorf("input = %+v", got)
	}
}

func TestCreateTestRun_WithCases(t *testing.T) {
	var got core.CreateTestRunInput
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{
		create: func(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
			got = input
			return &core.TestRun{ID: testRunID, ProjectID: input.ProjectID}, nil
		},
	}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.createTestRun(context.Background(), call("testify.testrun.create", map[string]any{
		"name":         "Run B",
		"testcase_ids": []any{testCaseID},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.TestPlanID != nil || len(got.CaseIDs) != 1 || got.CaseIDs[0] != testCaseID {
		t.Errorf("input = %+v", got)
	}
}

func TestCreateTestRun_RequiresName(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{}, nil)
	w := &WriteTools{reg: reg}
	res, _ := w.createTestRun(context.Background(), call("testify.testrun.create", map[string]any{}))
	assertErrorResult(t, "missing name", res, "name")
}

func TestCreateTestRun_RejectsBadPlanID(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{}, nil)
	w := &WriteTools{reg: reg}
	res, _ := w.createTestRun(context.Background(), call("testify.testrun.create", map[string]any{
		"name":        "Run C",
		"testplan_id": "nope",
	}))
	assertErrorResult(t, "bad plan id", res, "testplan_id")
}

// ---------------------------------------------------------------------------
// testrun.complete
// ---------------------------------------------------------------------------

func TestCompleteTestRun(t *testing.T) {
	completed := false
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{
		get: func(ctx context.Context, id string) (*core.TestRun, error) {
			return &core.TestRun{ID: id, ProjectID: testProjectID}, nil
		},
		complete: func(ctx context.Context, id string) error {
			completed = true
			return nil
		},
	}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.completeTestRun(context.Background(), call("testify.testrun.complete", map[string]any{
		"testrun_id": testRunID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if !completed {
		t.Fatal("complete was not called")
	}
}

func TestCompleteTestRun_ScopedGuard(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, &writeMockTestRunRepo{
		get: func(ctx context.Context, id string) (*core.TestRun, error) {
			return &core.TestRun{ID: id, ProjectID: "99999999-9999-9999-9999-999999999999"}, nil
		},
	}, nil)
	w := &WriteTools{reg: reg}

	res, _ := w.completeTestRun(context.Background(), call("testify.testrun.complete", map[string]any{
		"testrun_id": testRunID,
	}))
	assertErrorResult(t, "scoped guard", res, "test run not found")
}

// ---------------------------------------------------------------------------
// issue.updateStatus
// ---------------------------------------------------------------------------

func TestUpdateIssueStatus(t *testing.T) {
	var got core.IssueStatus
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, nil, &writeMockIssueRepo{
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id, ProjectID: testProjectID}, nil
		},
		updateStatus: func(ctx context.Context, id string, status core.IssueStatus) error {
			got = status
			return nil
		},
	})
	w := &WriteTools{reg: reg}

	res, _ := w.updateIssueStatus(context.Background(), call("testify.issue.updateStatus", map[string]any{
		"issue_id": testIssueID,
		"status":   "resolved",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got != core.IssueResolved {
		t.Errorf("status = %q, want resolved", got)
	}
}

func TestUpdateIssueStatus_RejectsInvalidStatus(t *testing.T) {
	reg := writeReg(writeSession(allWriteScopes()...), nil, nil, nil, &writeMockIssueRepo{
		get: func(ctx context.Context, id string) (*core.Issue, error) {
			return &core.Issue{ID: id, ProjectID: testProjectID}, nil
		},
	})
	w := &WriteTools{reg: reg}

	res, _ := w.updateIssueStatus(context.Background(), call("testify.issue.updateStatus", map[string]any{
		"issue_id": testIssueID,
		"status":   "done",
	}))
	assertErrorResult(t, "invalid status", res, "status")
}

// ---------------------------------------------------------------------------
// Register — all 13 write tools registered
// ---------------------------------------------------------------------------

func TestWriteToolsRegister(t *testing.T) {
	w := &WriteTools{reg: &Registry{}}
	if w.Name() != "write" {
		t.Errorf("Name() = %q", w.Name())
	}

	svr := server.NewMCPServer("test", "0.0.0")
	if err := w.Register(svr); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got := svr.ListTools()
	if len(got) != 13 {
		t.Fatalf("registered %d tools, want 13", len(got))
	}
	for _, name := range writeToolNames(w) {
		if _, ok := got[name]; !ok {
			t.Errorf("tool %q not registered", name)
		}
	}
}

func writeToolNames(w *WriteTools) []string {
	return []string{
		"testify.testcase.createBulk",
		"testify.testcase.update",
		"testify.testcase.duplicate",
		"testify.testcase.archive",
		"testify.testplan.create",
		"testify.testplan.addCases",
		"testify.testplan.removeCases",
		"testify.testplan.approve",
		"testify.testrun.create",
		"testify.testrun.recordResult",
		"testify.testrun.complete",
		"testify.issue.create",
		"testify.issue.updateStatus",
	}
}

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

func TestReviewOnlyEnvelope(t *testing.T) {
	env := reviewOnly(map[string]string{"id": "x"})
	if env["status"] != "draft" || env["mode"] != "review_only" {
		t.Errorf("envelope = %+v", env)
	}
	if _, ok := env["data"].(map[string]string); !ok {
		t.Errorf("data type = %T", env["data"])
	}
}

func TestBoolLiteral(t *testing.T) {
	if v, ok := boolLiteral(true); !ok || !v {
		t.Error("boolLiteral(true) = false")
	}
	if v, ok := boolLiteral(false); !ok || v {
		t.Error("boolLiteral(false) = true")
	}
	if _, ok := boolLiteral("true"); ok {
		t.Error("boolLiteral(string) should not be ok")
	}
	if _, ok := boolLiteral(1); ok {
		t.Error("boolLiteral(int) should not be ok")
	}
	if _, ok := boolLiteral(nil); ok {
		t.Error("boolLiteral(nil) should not be ok")
	}
}

func TestValidIssueType(t *testing.T) {
	for _, s := range []string{"bug", "feature", "improvement", "task"} {
		if !validIssueType(s) {
			t.Errorf("validIssueType(%q) = false, want true", s)
		}
	}
	for _, s := range []string{"", "BUG", "chore", "story"} {
		if validIssueType(s) {
			t.Errorf("validIssueType(%q) = true, want false", s)
		}
	}
}
