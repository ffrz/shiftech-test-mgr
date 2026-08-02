package tools

import (
	"context"
	"fmt"
	"regexp"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/shiftech/testify-platform/core"
)

// ReadTools registers discovery/read-only tools.
//
// Validation approach (TASKS.md T3.2): input validation is done manually in
// each handler — argument accessors from mcp-go (RequireString, GetInt, ...)
// plus enum/UUID helpers below. No third-party validator library (e.g.
// go-playground/validator) is introduced; this keeps the dependency surface
// minimal and matches the existing codebase style. Same decision applies to
// every later tool group (write/automation/analysis).
type ReadTools struct {
	reg *Registry
}

func (t *ReadTools) Name() string { return "read" }

func (t *ReadTools) Register(s ToolAdder) error {
	// project
	s.AddTool(mcp.NewTool("testify.project.list",
		mcp.WithDescription("List projects accessible to this project-scoped API token."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
	), t.listProjects)
	s.AddTool(mcp.NewTool("testify.project.get",
		mcp.WithDescription("Get the project bound to this MCP session."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session"), mcp.Required()),
	), t.getProject)

	// test case
	s.AddTool(mcp.NewTool("testify.testcase.search",
		mcp.WithDescription("Search project test cases by module, tag, priority, status, or free text."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("module_id", mcp.Description("Exact module UUID")),
		mcp.WithString("module", mcp.Description("Case-insensitive exact module name or code")),
		mcp.WithString("tag", mcp.Description("Case-insensitive exact tag name")),
		mcp.WithString("priority", mcp.Enum("low", "medium", "high", "critical")),
		mcp.WithString("status", mcp.Enum("active", "archived")),
		mcp.WithString("query", mcp.Description("Free text matched against case code, title, objective, preconditions, steps, and expected result")),
		mcp.WithString("cursor", mcp.Description("Opaque nextCursor from the previous response")),
		mcp.WithNumber("limit", mcp.Description("Page size, default 50 and maximum 100"), mcp.Min(1), mcp.Max(100)),
	), t.searchTestCases)
	s.AddTool(mcp.NewTool("testify.testcase.get",
		mcp.WithDescription("Get full test-case detail including structured steps and expected results."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID returned by testcase.search"), mcp.Required()),
	), t.getTestCase)

	// test plan
	s.AddTool(mcp.NewTool("testify.testplan.list",
		mcp.WithDescription("List test plans in the scoped project."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("cursor", mcp.Description("Opaque nextCursor from the previous response")),
		mcp.WithNumber("limit", mcp.Description("Page size, default 50 and maximum 100"), mcp.Min(1), mcp.Max(100)),
	), t.listTestPlans)
	s.AddTool(mcp.NewTool("testify.testplan.get",
		mcp.WithDescription("Get a test plan and all test cases in its ordered scope."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID"), mcp.Required()),
	), t.getTestPlan)

	// test run
	s.AddTool(mcp.NewTool("testify.testrun.list",
		mcp.WithDescription("List test runs with result summaries computed on demand."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testplan_id", mcp.Description("Optional test plan UUID to filter runs")),
		mcp.WithString("status", mcp.Enum("in_progress", "completed")),
		mcp.WithString("cursor", mcp.Description("Opaque nextCursor from the previous response")),
		mcp.WithNumber("limit", mcp.Description("Page size, default 50 and maximum 100"), mcp.Min(1), mcp.Max(100)),
	), t.listTestRuns)
	s.AddTool(mcp.NewTool("testify.testrun.get",
		mcp.WithDescription("Get a test run with a result summary computed on demand."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID"), mcp.Required()),
	), t.getTestRun)

	// test result
	s.AddTool(mcp.NewTool("testify.testresult.list",
		mcp.WithDescription("List test results filtered by status, tester, or run."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("status", mcp.Enum("pass", "fail", "skip", "blocked", "not_run")),
		mcp.WithString("tester_id", mcp.Description("Profile UUID who executed the result")),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID")),
		mcp.WithString("cursor", mcp.Description("Opaque nextCursor from the previous response")),
		mcp.WithNumber("limit", mcp.Description("Page size, default 50 and maximum 100"), mcp.Min(1), mcp.Max(100)),
	), t.listTestResults)

	// issue
	s.AddTool(mcp.NewTool("testify.issue.search",
		mcp.WithDescription("Search issues by status, priority, assignee, run, case, or free text."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("status", mcp.Enum("backlog", "open", "in_progress", "resolved", "verified", "closed", "rejected", "duplicate")),
		mcp.WithString("priority", mcp.Enum("low", "medium", "high", "critical")),
		mcp.WithString("assignee_id", mcp.Description("Profile UUID assigned to the issue")),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID the issue was filed against")),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID the issue relates to")),
		mcp.WithString("query", mcp.Description("Free text matched against issue code, title, or description")),
		mcp.WithString("cursor", mcp.Description("Opaque nextCursor from the previous response")),
		mcp.WithNumber("limit", mcp.Description("Page size, default 50 and maximum 100"), mcp.Min(1), mcp.Max(100)),
	), t.searchIssues)
	s.AddTool(mcp.NewTool("testify.issue.get",
		mcp.WithDescription("Get issue detail."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("issue_id", mcp.Description("Issue UUID"), mcp.Required()),
	), t.getIssue)

	return nil
}

// ---------------------------------------------------------------------------
// project
// ---------------------------------------------------------------------------

func (t *ReadTools) listProjects(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	projects, err := t.reg.Services.Project.List(ctx, core.ProjectFilter{Limit: 50})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	scoped := make([]core.Project, 0, 1)
	for _, p := range projects {
		if p.ID == session.ProjectID {
			scoped = append(scoped, p)
		}
	}

	return mcp.NewToolResultStructured(scoped, fmt.Sprintf("%d project(s) found", len(scoped))), nil
}

func (t *ReadTools) getProject(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	projectID := req.GetString("project_id", session.ProjectID)
	if projectID != session.ProjectID {
		return mcp.NewToolResultError("project_id does not match the scoped session"), nil
	}

	project, err := t.reg.Services.Project.Get(ctx, projectID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(project, "project found"), nil
}

// ---------------------------------------------------------------------------
// test case
// ---------------------------------------------------------------------------

func (t *ReadTools) searchTestCases(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	filter := core.TestCaseFilter{ProjectID: session.ProjectID}

	if raw := req.GetString("module_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("module_id must be a valid UUID"), nil
		}
		filter.ModuleID = &raw
	}
	if raw := req.GetString("module", ""); raw != "" {
		filter.Module = &raw
	}
	if raw := req.GetString("tag", ""); raw != "" {
		filter.Tag = &raw
	}
	if raw := req.GetString("priority", ""); raw != "" {
		if !validPriority(raw) {
			return mcp.NewToolResultErrorf("priority must be one of: low, medium, high, critical"), nil
		}
		p := core.TestCasePriority(raw)
		filter.Priority = &p
	}
	if raw := req.GetString("status", ""); raw != "" {
		if !validTestCaseStatus(raw) {
			return mcp.NewToolResultErrorf("status must be one of: active, archived"), nil
		}
		s := core.TestCaseStatus(raw)
		filter.Status = &s
	}
	if raw := req.GetString("query", ""); raw != "" {
		filter.Search = &raw
	}
	if raw := req.GetString("cursor", ""); raw != "" {
		filter.Cursor = &raw
	}
	filter.Limit = validLimit(req.GetInt("limit", 50))

	result, err := t.reg.Services.TestCase.List(ctx, filter)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d test case(s) found", len(result.Items))), nil
}

func (t *ReadTools) getTestCase(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	testCaseID, err := req.RequireString("testcase_id")
	if err != nil || !isUUID(testCaseID) {
		return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
	}

	tc, err := t.reg.Services.TestCase.Get(ctx, testCaseID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tc.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test case not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(tc, "test case found"), nil
}

// ---------------------------------------------------------------------------
// test plan
// ---------------------------------------------------------------------------

func (t *ReadTools) listTestPlans(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	filter := core.TestPlanFilter{ProjectID: session.ProjectID}
	if raw := req.GetString("cursor", ""); raw != "" {
		filter.Cursor = &raw
	}
	filter.Limit = validLimit(req.GetInt("limit", 50))

	result, err := t.reg.Services.TestPlan.List(ctx, filter)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d test plan(s) found", len(result.Items))), nil
}

func (t *ReadTools) getTestPlan(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	testPlanID, err := req.RequireString("testplan_id")
	if err != nil || !isUUID(testPlanID) {
		return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
	}

	tp, err := t.reg.Services.TestPlan.Get(ctx, testPlanID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tp.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test plan not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(tp, "test plan found"), nil
}

// ---------------------------------------------------------------------------
// test run
// ---------------------------------------------------------------------------

func (t *ReadTools) listTestRuns(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	filter := core.TestRunFilter{ProjectID: session.ProjectID}
	if raw := req.GetString("testplan_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
		}
		filter.PlanID = &raw
	}
	if raw := req.GetString("status", ""); raw != "" {
		if !validRunStatus(raw) {
			return mcp.NewToolResultErrorf("status must be one of: in_progress, completed"), nil
		}
		s := core.TestRunStatus(raw)
		filter.Status = &s
	}
	if raw := req.GetString("cursor", ""); raw != "" {
		filter.Cursor = &raw
	}
	filter.Limit = validLimit(req.GetInt("limit", 50))

	result, err := t.reg.Services.TestRun.List(ctx, filter)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d test run(s) found", len(result.Items))), nil
}

func (t *ReadTools) getTestRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	testRunID, err := req.RequireString("testrun_id")
	if err != nil || !isUUID(testRunID) {
		return mcp.NewToolResultError("testrun_id must be a valid UUID"), nil
	}

	tr, err := t.reg.Services.TestRun.Get(ctx, testRunID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tr.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test run not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(tr, "test run found"), nil
}

// ---------------------------------------------------------------------------
// test result
// ---------------------------------------------------------------------------

func (t *ReadTools) listTestResults(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	filter := core.TestResultFilter{ProjectID: session.ProjectID}
	if raw := req.GetString("status", ""); raw != "" {
		if !validResultStatus(raw) {
			return mcp.NewToolResultErrorf("status must be one of: pass, fail, skip, blocked, not_run"), nil
		}
		s := core.TestResultStatus(raw)
		filter.Status = &s
	}
	if raw := req.GetString("tester_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("tester_id must be a valid UUID"), nil
		}
		filter.TesterID = &raw
	}
	if raw := req.GetString("testrun_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testrun_id must be a valid UUID"), nil
		}
		filter.RunID = &raw
	}
	if raw := req.GetString("cursor", ""); raw != "" {
		filter.Cursor = &raw
	}
	filter.Limit = validLimit(req.GetInt("limit", 50))

	result, err := t.reg.Services.TestResult.List(ctx, filter)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d test result(s) found", len(result.Items))), nil
}

// ---------------------------------------------------------------------------
// issue
// ---------------------------------------------------------------------------

func (t *ReadTools) searchIssues(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	filter := core.IssueFilter{ProjectID: session.ProjectID}
	if raw := req.GetString("status", ""); raw != "" {
		if !validIssueStatus(raw) {
			return mcp.NewToolResultErrorf("status must be one of: backlog, open, in_progress, resolved, verified, closed, rejected, duplicate"), nil
		}
		s := core.IssueStatus(raw)
		filter.Status = &s
	}
	if raw := req.GetString("priority", ""); raw != "" {
		if !validIssuePriority(raw) {
			return mcp.NewToolResultErrorf("priority must be one of: low, medium, high, critical"), nil
		}
		p := core.IssuePriority(raw)
		filter.Priority = &p
	}
	if raw := req.GetString("assignee_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("assignee_id must be a valid UUID"), nil
		}
		filter.AssigneeID = &raw
	}
	if raw := req.GetString("testrun_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testrun_id must be a valid UUID"), nil
		}
		filter.RunID = &raw
	}
	if raw := req.GetString("testcase_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
		}
		filter.CaseID = &raw
	}
	if raw := req.GetString("query", ""); raw != "" {
		filter.Search = &raw
	}
	if raw := req.GetString("cursor", ""); raw != "" {
		filter.Cursor = &raw
	}
	filter.Limit = validLimit(req.GetInt("limit", 50))

	result, err := t.reg.Services.Issue.List(ctx, filter)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("%d issue(s) found", len(result.Items))), nil
}

func (t *ReadTools) getIssue(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	issueID, err := req.RequireString("issue_id")
	if err != nil || !isUUID(issueID) {
		return mcp.NewToolResultError("issue_id must be a valid UUID"), nil
	}

	iss, err := t.reg.Services.Issue.Get(ctx, issueID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if iss.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("issue not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(iss, "issue found"), nil
}

// ---------------------------------------------------------------------------
// validation helpers
// ---------------------------------------------------------------------------

var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

// validLimit clamps a page-size request to the [1,100] range advertised by the
// tool schema. mcp-go enforces Min/Max only as JSON Schema metadata, not at
// runtime, so a raw client could send limit=1000 and blow up the query.
func validLimit(n int) int {
	if n < 1 {
		return 1
	}
	if n > 100 {
		return 100
	}
	return int(n)
}

func isUUID(s string) bool {
	return uuidPattern.MatchString(s)
}

func validPriority(s string) bool {
	switch core.TestCasePriority(s) {
	case core.PriorityLow, core.PriorityMedium, core.PriorityHigh, core.PriorityCritical:
		return true
	}
	return false
}

func validIssuePriority(s string) bool {
	switch core.IssuePriority(s) {
	case core.IssuePriorityLow, core.IssuePriorityMedium, core.IssuePriorityHigh, core.IssuePriorityCritical:
		return true
	}
	return false
}

func validStepType(s string) bool {
	switch core.StepType(s) {
	case core.StepSimple, core.StepDetailed:
		return true
	}
	return false
}

// strPtrIfNonEmpty returns a pointer to s when non-empty, nil otherwise —
// used to keep optional string inputs null (not "") in the domain payload.
func strPtrIfNonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func validTestCaseStatus(s string) bool {
	switch core.TestCaseStatus(s) {
	case core.TestCaseStatusActive, core.TestCaseStatusArchived:
		return true
	}
	return false
}

func validRunStatus(s string) bool {
	switch core.TestRunStatus(s) {
	case core.RunInProgress, core.RunCompleted:
		return true
	}
	return false
}

func validResultStatus(s string) bool {
	switch core.TestResultStatus(s) {
	case core.ResultPass, core.ResultFail, core.ResultSkip, core.ResultBlocked, core.ResultNotRun:
		return true
	}
	return false
}

func validIssueStatus(s string) bool {
	switch core.IssueStatus(s) {
	case core.IssueBacklog, core.IssueOpen, core.IssueInProgress, core.IssueResolved,
		core.IssueVerified, core.IssueClosed, core.IssueRejected, core.IssueDuplicate:
		return true
	}
	return false
}
