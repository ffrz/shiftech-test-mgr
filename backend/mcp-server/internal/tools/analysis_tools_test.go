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
// mock repo
// ---------------------------------------------------------------------------

type writeMockAnalysisRepo struct {
	runSummary      func(ctx context.Context, projectID, testRunID string) (*core.AnalysisRunSummary, error)
	flakyCandidates func(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error)
	suggestRetest   func(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]core.RetestSuggestion, error)
}

func (m *writeMockAnalysisRepo) RunSummary(ctx context.Context, projectID, testRunID string) (*core.AnalysisRunSummary, error) {
	return m.runSummary(ctx, projectID, testRunID)
}
func (m *writeMockAnalysisRepo) FlakyCandidates(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error) {
	return m.flakyCandidates(ctx, projectID, lookbackRuns, minExecutions, limit)
}
func (m *writeMockAnalysisRepo) SuggestRetest(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]core.RetestSuggestion, error) {
	return m.suggestRetest(ctx, projectID, testRunID, lookbackRuns, limit)
}

func analysisReg(session *auth.Session, m *writeMockAnalysisRepo) *Registry {
	reg := &Registry{Session: session}
	if m != nil {
		reg.Services.Analysis = service.NewAnalysisService(m)
	}
	return reg
}

// ---------------------------------------------------------------------------
// Register — all 3 analysis tools registered
// ---------------------------------------------------------------------------

func TestAnalysisToolsRegister(t *testing.T) {
	a := &AnalysisTools{reg: &Registry{}}
	if a.Name() != "analysis" {
		t.Errorf("Name() = %q", a.Name())
	}

	svr := server.NewMCPServer("test", "0.0.0")
	if err := a.Register(svr); err != nil {
		t.Fatalf("Register: %v", err)
	}
	got := svr.ListTools()
	if len(got) != 3 {
		t.Fatalf("registered %d tools, want 3", len(got))
	}
	for _, name := range analysisToolNames() {
		if _, ok := got[name]; !ok {
			t.Errorf("tool %q not registered", name)
		}
	}
}

func analysisToolNames() []string {
	return []string{
		"testify.analysis.run_summary",
		"testify.analysis.flaky_candidates",
		"testify.analysis.suggest_retest",
	}
}

// ---------------------------------------------------------------------------
// run_summary
// ---------------------------------------------------------------------------

func TestRunSummary_Valid(t *testing.T) {
	var gotProject, gotRun string
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{
		runSummary: func(ctx context.Context, projectID, testRunID string) (*core.AnalysisRunSummary, error) {
			gotProject, gotRun = projectID, testRunID
			return &core.AnalysisRunSummary{
				Run:                core.TestRun{ID: testRunID, ProjectID: projectID},
				PassRate:           80,
				FailureRate:        20,
				ProblematicResults: []core.AnalysisProblematicResult{{TestResultID: testResultID, Status: core.ResultFail}},
			}, nil
		},
	})
	a := &AnalysisTools{reg: reg}

	res, _ := a.runSummary(context.Background(), call("testify.analysis.run_summary", map[string]any{
		"testrun_id": testRunID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotProject != testProjectID || gotRun != testRunID {
		t.Errorf("repo called with project=%q run=%q", gotProject, gotRun)
	}
}

func TestRunSummary_RejectsBadRunID(t *testing.T) {
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{})
	a := &AnalysisTools{reg: reg}

	res, _ := a.runSummary(context.Background(), call("testify.analysis.run_summary", map[string]any{
		"testrun_id": "nope",
	}))
	assertErrorResult(t, "bad run id", res, "testrun_id")
}

func TestRunSummary_RequiresRunID(t *testing.T) {
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{})
	a := &AnalysisTools{reg: reg}

	res, _ := a.runSummary(context.Background(), call("testify.analysis.run_summary", map[string]any{}))
	assertErrorResult(t, "missing run id", res, "testrun_id")
}

// ---------------------------------------------------------------------------
// flaky_candidates — defaults and clamps
// ---------------------------------------------------------------------------

func TestFlakyCandidates_Defaults(t *testing.T) {
	var gotLookback, gotMinExec, gotLimit int
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{
		flakyCandidates: func(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error) {
			gotLookback, gotMinExec, gotLimit = lookbackRuns, minExecutions, limit
			return nil, nil
		},
	})
	a := &AnalysisTools{reg: reg}

	res, _ := a.flakyCandidates(context.Background(), call("testify.analysis.flaky_candidates", map[string]any{}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotLookback != 10 || gotMinExec != 3 || gotLimit != 25 {
		t.Errorf("defaults = lookback:%d minExec:%d limit:%d, want 10/3/25", gotLookback, gotMinExec, gotLimit)
	}
}

func TestFlakyCandidates_Clamps(t *testing.T) {
	var gotLookback, gotMinExec, gotLimit int
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{
		flakyCandidates: func(ctx context.Context, projectID string, lookbackRuns, minExecutions, limit int) ([]core.FlakyCandidate, error) {
			gotLookback, gotMinExec, gotLimit = lookbackRuns, minExecutions, limit
			return nil, nil
		},
	})
	a := &AnalysisTools{reg: reg}

	res, _ := a.flakyCandidates(context.Background(), call("testify.analysis.flaky_candidates", map[string]any{
		"lookback_runs":    float64(1),
		"min_executions":   float64(500),
		"limit":            float64(0),
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotLookback != 2 || gotMinExec != 50 || gotLimit != 25 {
		t.Errorf("clamps = lookback:%d minExec:%d limit:%d, want 2/50/25", gotLookback, gotMinExec, gotLimit)
	}
}

// ---------------------------------------------------------------------------
// suggest_retest
// ---------------------------------------------------------------------------

func TestSuggestRetest_Valid(t *testing.T) {
	var gotRun string
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{
		suggestRetest: func(ctx context.Context, projectID, testRunID string, lookbackRuns, limit int) ([]core.RetestSuggestion, error) {
			gotRun = testRunID
			return []core.RetestSuggestion{
				{
					TestCaseID:   testCaseID,
					Code:         "TC-1",
					Title:        "Login",
					Priority:     core.PriorityHigh,
					LatestStatus: core.ResultFail,
					Score:        120,
					Reasons:      []string{"failed_in_target_run"},
					OpenIssueCount: 1,
					FlakinessScore: 0.5,
				},
			}, nil
		},
	})
	a := &AnalysisTools{reg: reg}

	res, _ := a.suggestRetest(context.Background(), call("testify.analysis.suggest_retest", map[string]any{
		"testrun_id": testRunID,
	}))
	if res == nil || res.IsError {
		t.Fatalf("expected success, got %+v", res)
	}
	if gotRun != testRunID {
		t.Errorf("repo called with run=%q", gotRun)
	}
}

func TestSuggestRetest_RejectsBadRunID(t *testing.T) {
	reg := analysisReg(writeSession(), &writeMockAnalysisRepo{})
	a := &AnalysisTools{reg: reg}

	res, _ := a.suggestRetest(context.Background(), call("testify.analysis.suggest_retest", map[string]any{
		"testrun_id": "nope",
	}))
	assertErrorResult(t, "bad run id", res, "testrun_id")
}

// ---------------------------------------------------------------------------

// compile-time interface check
var _ core.AnalysisRepository = (*writeMockAnalysisRepo)(nil)
