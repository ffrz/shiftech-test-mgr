package tools

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
)

// AnalysisTools registers the on-demand analysis tools (Epic 5 / BACKLOG.md).
// Ported from analysisTools.ts. All three are read-only and session-scoped;
// metrics are always derived on demand, never cached (TASKS.md T5.3).
type AnalysisTools struct {
	reg *Registry
}

func (t *AnalysisTools) Name() string { return "analysis" }

func (t *AnalysisTools) Register(s ToolAdder) error {
	s.AddTool(mcp.NewTool("testify.analysis.run_summary",
		mcp.WithDescription("Analyze one regression run with on-demand counts, pass/failure rates, and bounded problematic results."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID"), mcp.Required()),
	), t.runSummary)
	s.AddTool(mcp.NewTool("testify.analysis.flaky_candidates",
		mcp.WithDescription("Find tests whose executed outcomes alternate between pass and fail across recent project runs."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithNumber("lookback_runs", mcp.Description("Latest project runs per test case to inspect, default 10"), mcp.Min(2), mcp.Max(50)),
		mcp.WithNumber("min_executions", mcp.Description("Minimum pass/fail executions, default 3"), mcp.Min(2), mcp.Max(50)),
		mcp.WithNumber("limit", mcp.Description("Maximum candidates, default 25"), mcp.Min(1), mcp.Max(100)),
	), t.flakyCandidates)
	s.AddTool(mcp.NewTool("testify.analysis.suggest_retest",
		mcp.WithDescription("Rank cases from one run for retest using outcome, priority, active issues, and recent pass/fail instability."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID"), mcp.Required()),
		mcp.WithNumber("lookback_runs", mcp.Description("Latest project runs per test case to inspect, default 10"), mcp.Min(2), mcp.Max(50)),
		mcp.WithNumber("limit", mcp.Description("Maximum candidates, default 25"), mcp.Min(1), mcp.Max(100)),
	), t.suggestRetest)

	return nil
}

func (t *AnalysisTools) runSummary(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	testRunID, err := req.RequireString("testrun_id")
	if err != nil || !isUUID(testRunID) {
		return mcp.NewToolResultError("testrun_id must be a valid UUID"), nil
	}

	summary, err := t.reg.Services.Analysis.RunSummary(ctx, session.ProjectID, testRunID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(summary, "run summary computed on demand"), nil
}

func (t *AnalysisTools) flakyCandidates(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	candidates, err := t.reg.Services.Analysis.FlakyCandidates(
		ctx,
		session.ProjectID,
		req.GetInt("lookback_runs", 10),
		req.GetInt("min_executions", 3),
		req.GetInt("limit", 25),
	)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(candidates, fmt.Sprintf("%d flaky candidate(s) found", len(candidates))), nil
}

func (t *AnalysisTools) suggestRetest(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	testRunID, err := req.RequireString("testrun_id")
	if err != nil || !isUUID(testRunID) {
		return mcp.NewToolResultError("testrun_id must be a valid UUID"), nil
	}

	suggestions, err := t.reg.Services.Analysis.SuggestRetest(
		ctx,
		session.ProjectID,
		testRunID,
		req.GetInt("lookback_runs", 10),
		req.GetInt("limit", 25),
	)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(suggestions, fmt.Sprintf("%d retest suggestion(s) found", len(suggestions))), nil
}
