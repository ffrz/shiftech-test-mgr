package tools

import (
	"context"
	"testing"

	"github.com/mark3labs/mcp-go/server"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// ---------------------------------------------------------------------------
// mock repo (same style as write_tools_test.go)
// ---------------------------------------------------------------------------

type writeMockAutomationRepo struct {
	mapScript   func(ctx context.Context, input core.MapScriptInput) (*core.AutomationScript, error)
	enqueue     func(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error)
	rerunFailed func(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error)
	jobStatus   func(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error)
	runnerList  func(ctx context.Context, projectID string) ([]core.AutomationRunner, error)
}

func (m *writeMockAutomationRepo) MapScript(ctx context.Context, input core.MapScriptInput) (*core.AutomationScript, error) {
	return m.mapScript(ctx, input)
}
func (m *writeMockAutomationRepo) Enqueue(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
	return m.enqueue(ctx, input)
}
func (m *writeMockAutomationRepo) RerunFailed(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error) {
	return m.rerunFailed(ctx, input)
}
func (m *writeMockAutomationRepo) JobStatus(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error) {
	return m.jobStatus(ctx, projectID, jobID)
}
func (m *writeMockAutomationRepo) RunnerList(ctx context.Context, projectID string) ([]core.AutomationRunner, error) {
	return m.runnerList(ctx, projectID)
}

func automationReg(session *auth.Session, m *writeMockAutomationRepo) *Registry {
	reg := &Registry{Session: session}
	if m != nil {
		reg.Services.Automation = service.NewAutomationService(m)
	}
	return reg
}

// ---------------------------------------------------------------------------
// Register — all 5 automation tools registered
// ---------------------------------------------------------------------------

func TestAutomationToolsRegister(t *testing.T) {
	a := &AutomationTools{reg: &Registry{}}
	if a.Name() != "automation" {
		t.Errorf("Name() = %q", a.Name())
	}

	svr := server.NewMCPServer("test", "0.0.0")
	if err := a.Register(svr); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got := svr.ListTools()
	if len(got) != 5 {
		t.Fatalf("registered %d tools, want 5", len(got))
	}
	for _, name := range automationToolNames() {
		if _, ok := got[name]; !ok {
			t.Errorf("tool %q not registered", name)
		}
	}
}

func automationToolNames() []string {
	return []string{
		"testify.automation.job_status",
		"testify.automation.runner_list",
		"testify.automation.map_script",
		"testify.automation.enqueue",
		"testify.automation.rerun_failed",
	}
}

// ---------------------------------------------------------------------------
// map_script
// ---------------------------------------------------------------------------

func TestMapScript_Valid(t *testing.T) {
	var got core.MapScriptInput
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		mapScript: func(ctx context.Context, input core.MapScriptInput) (*core.AutomationScript, error) {
			got = input
			return &core.AutomationScript{ID: "script-1", ProjectID: input.ProjectID, TestCaseID: input.TestCaseID}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.mapScript(context.Background(), call("testify.automation.map_script", map[string]any{
		"testcase_id":   testCaseID,
		"script_ref":    "e2e/login.spec.ts",
		"runner_labels": []any{"chromium", "staging"},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.ProjectID != testProjectID || got.TestCaseID != testCaseID {
		t.Errorf("input = %+v", got)
	}
	if got.ScriptRef != "e2e/login.spec.ts" {
		t.Errorf("script_ref = %q", got.ScriptRef)
	}
	if len(got.RunnerLabels) != 2 || got.RunnerLabels[0] != "chromium" {
		t.Errorf("runner_labels = %v", got.RunnerLabels)
	}
	if got.CreatedBy != testApprover {
		t.Errorf("created_by = %q, want %q (token creator)", got.CreatedBy, testApprover)
	}
}

func TestMapScript_RequiresScriptRef(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.mapScript(context.Background(), call("testify.automation.map_script", map[string]any{
		"testcase_id": testCaseID,
	}))
	assertErrorResult(t, "missing script_ref", res, "script_ref")
}

func TestMapScript_RejectsInvalidTestCaseID(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.mapScript(context.Background(), call("testify.automation.map_script", map[string]any{
		"testcase_id": "nope",
		"script_ref":  "e2e/x.spec.ts",
	}))
	assertErrorResult(t, "bad testcase_id", res, "testcase_id")
}

// ---------------------------------------------------------------------------
// enqueue
// ---------------------------------------------------------------------------

func TestEnqueue_ExactlyOneTarget(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		enqueue: func(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
			return &core.AutomationEnqueueResult{RunID: testRunID, RunCode: "TR-1", JobCount: 1}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.enqueue(context.Background(), call("testify.automation.enqueue", map[string]any{
		"name": "Run",
	}))
	assertErrorResult(t, "missing target", res, "EXACTLY_ONE")
}

func TestEnqueue_WithTestCase(t *testing.T) {
	var got core.AutomationEnqueueInput
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		enqueue: func(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
			got = input
			return &core.AutomationEnqueueResult{RunID: testRunID, RunCode: "TR-1", JobCount: 3}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.enqueue(context.Background(), call("testify.automation.enqueue", map[string]any{
		"testcase_id":   testCaseID,
		"max_attempts":  float64(3),
		"runner_labels": []any{"chromium"},
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.TestCaseID == nil || *got.TestCaseID != testCaseID || got.TestPlanID != nil {
		t.Errorf("input = %+v", got)
	}
	if got.MaxAttempts != 3 {
		t.Errorf("max_attempts = %d", got.MaxAttempts)
	}
	if got.CreatedBy != testApprover {
		t.Errorf("created_by = %q", got.CreatedBy)
	}
}

func TestEnqueue_WithTestPlan(t *testing.T) {
	var got core.AutomationEnqueueInput
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		enqueue: func(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
			got = input
			return &core.AutomationEnqueueResult{RunID: testRunID, RunCode: "TR-2", JobCount: 2}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.enqueue(context.Background(), call("testify.automation.enqueue", map[string]any{
		"testplan_id": testPlanID,
		"name":        "Nightly",
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.TestPlanID == nil || *got.TestPlanID != testPlanID || got.TestCaseID != nil {
		t.Errorf("input = %+v", got)
	}
	if got.Name != "Nightly" {
		t.Errorf("name = %q", got.Name)
	}
}

func TestEnqueue_RejectsMissingScope(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteTestRun), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.enqueue(context.Background(), call("testify.automation.enqueue", map[string]any{
		"testcase_id": testCaseID,
	}))
	assertErrorResult(t, "missing scope", res, "missing scope")
}

func TestEnqueue_RejectsBadTargetID(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.enqueue(context.Background(), call("testify.automation.enqueue", map[string]any{
		"testcase_id": "nope",
	}))
	assertErrorResult(t, "bad id", res, "testcase_id")
}

// ---------------------------------------------------------------------------
// rerun_failed — human gate
// ---------------------------------------------------------------------------

func TestRerunFailed_ConfirmationRequired(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		rerunFailed: func(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error) {
			return &core.RerunFailedResult{SelectedCount: 40, ConfirmationRequired: true, SelectionLimit: 25}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.rerunFailed(context.Background(), call("testify.automation.rerun_failed", map[string]any{
		"issue_id": testIssueID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success (confirmation request), got %+v", res)
	}
	got, ok := res.StructuredContent.(*core.RerunFailedResult)
	if !ok {
		t.Fatalf("StructuredContent = %T, want *core.RerunFailedResult", res.StructuredContent)
	}
	if !got.ConfirmationRequired {
		t.Errorf("ConfirmationRequired = %v, want true", got.ConfirmationRequired)
	}
	if got.SelectionLimit != 25 {
		t.Errorf("SelectionLimit = %d, want 25", got.SelectionLimit)
	}
}

func TestRerunFailed_WithConfirmation(t *testing.T) {
	var got core.RerunFailedInput
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{
		rerunFailed: func(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error) {
			got = input
			return &core.RerunFailedResult{RunID: testRunID, RunCode: "TR-3", JobCount: 5, SelectedCount: 5, SourceTestCaseID: testCaseID}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.rerunFailed(context.Background(), call("testify.automation.rerun_failed", map[string]any{
		"issue_id":              testIssueID,
		"confirmed_by":          testApprover,
		"explicit_confirmation": true,
		"selection_limit":       float64(25),
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if got.IssueID != testIssueID {
		t.Errorf("issue_id = %q", got.IssueID)
	}
	if got.ConfirmedBy == nil || *got.ConfirmedBy != testApprover {
		t.Errorf("confirmed_by = %v", got.ConfirmedBy)
	}
	if !got.ExplicitConfirmation {
		t.Errorf("explicit_confirmation = false, want true")
	}
	if got.CreatedBy != testApprover {
		t.Errorf("created_by = %q", got.CreatedBy)
	}
}

func TestRerunFailed_RejectsStringConfirmation(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.rerunFailed(context.Background(), call("testify.automation.rerun_failed", map[string]any{
		"issue_id":              testIssueID,
		"explicit_confirmation": "true",
	}))
	assertErrorResult(t, "string confirmation", res, "explicit_confirmation")
}

func TestRerunFailed_RejectsMissingIssueID(t *testing.T) {
	reg := automationReg(writeSession(core.ScopeWriteAutomation), &writeMockAutomationRepo{})
	a := &AutomationTools{reg: reg}

	res, _ := a.rerunFailed(context.Background(), call("testify.automation.rerun_failed", map[string]any{}))
	assertErrorResult(t, "missing issue_id", res, "issue_id")
}

// ---------------------------------------------------------------------------
// job_status / runner_list
// ---------------------------------------------------------------------------

func TestJobStatus_NotFound(t *testing.T) {
	reg := automationReg(writeSession(), &writeMockAutomationRepo{
		jobStatus: func(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error) {
			return nil, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.jobStatus(context.Background(), call("testify.automation.job_status", map[string]any{
		"job_id": testRunID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if text := resultText(t, res); text == "" || text == "automation job found" {
		t.Errorf("unexpected message %q", text)
	}
}

func TestJobStatus_Found(t *testing.T) {
	reg := automationReg(writeSession(), &writeMockAutomationRepo{
		jobStatus: func(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error) {
			return &core.AutomationJob{ID: jobID, Status: core.JobRunning}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.jobStatus(context.Background(), call("testify.automation.job_status", map[string]any{
		"job_id": testRunID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	got, ok := res.StructuredContent.(*core.AutomationJob)
	if !ok {
		t.Fatalf("StructuredContent = %T, want *core.AutomationJob", res.StructuredContent)
	}
	if got.Status != core.JobRunning {
		t.Errorf("status = %q, want running", got.Status)
	}
}

func TestRunnerList(t *testing.T) {
	reg := automationReg(writeSession(), &writeMockAutomationRepo{
		runnerList: func(ctx context.Context, projectID string) ([]core.AutomationRunner, error) {
			return []core.AutomationRunner{
				{ID: "r1", Name: "office", Status: "online"},
			}, nil
		},
	})
	a := &AutomationTools{reg: reg}

	res, _ := a.runnerList(context.Background(), call("testify.automation.runner_list", map[string]any{}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
}

// ---------------------------------------------------------------------------
// helpers / pure functions
// ---------------------------------------------------------------------------

func TestRequireStringSlice(t *testing.T) {
	got, err := requireStringSlice([]any{"chromium", "staging"}, "runner_labels", 1, 80, 20)
	if err != nil {
		t.Fatalf("requireStringSlice: %v", err)
	}
	if len(got) != 2 || got[0] != "chromium" {
		t.Errorf("requireStringSlice = %v", got)
	}

	if _, err := requireStringSlice("nope", "runner_labels", 1, 80, 20); err == nil {
		t.Error("expected error for non-array")
	}
	if _, err := requireStringSlice([]any{"", "x"}, "runner_labels", 1, 80, 20); err == nil {
		t.Error("expected error for empty item")
	}
	if _, err := requireStringSlice([]any{42}, "runner_labels", 1, 80, 20); err == nil {
		t.Error("expected error for non-string item")
	}
	over := make([]any, 21)
	for i := range over {
		over[i] = "x"
	}
	if _, err := requireStringSlice(over, "runner_labels", 1, 80, 20); err == nil {
		t.Error("expected error for over-limit array")
	}
}

// ensure the mock satisfies the interface (compile-time check)
var _ core.AutomationRepository = (*writeMockAutomationRepo)(nil)
