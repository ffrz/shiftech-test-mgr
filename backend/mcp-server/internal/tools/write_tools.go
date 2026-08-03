package tools

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
)

// WriteTools registers mutation tools. This is a port of the Node writeTools
// with the same guardrails (TASKS.md T4.1):
//
//   - Every mutation returns a review-only draft envelope
//     { status: "draft", mode: "review_only", data } — the write is staged for
//     human confirmation, it is never presented as a final, already-applied
//     change. The only exceptions are the two explicit human-gate actions
//     below.
//   - Human gate: testplan.approve requires an explicit_approval: true literal
//     plus an approver_id (no implicit trust in the caller), and
//     testrun.complete is a manual-only transition. Neither is ever inferred
//     from result fill.
//   - Bulk tools clamp batch size to 100 (createBulk, addCases, removeCases).
//   - Scope checks gate each tool; project references inside arguments are
//     validated recursively against the session scope (AssertProjectReferences).
//
// Deferred to a later phase (matching the Node port): issue.comment (needs an
// issue_comments table migration) and issue.detectDuplicate (needs the AI
// gateway).
type WriteTools struct {
	reg *Registry
}

func (t *WriteTools) Name() string { return "write" }

func (t *WriteTools) Register(s ToolAdder) error {
	// test case
	s.AddTool(mcp.NewTool("testify.testcase.createBulk",
		mcp.WithDescription("Create one or more test cases in the scoped project as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithArray("cases", mcp.Description("Batch of test cases, maximum 100"), mcp.MaxItems(100), mcp.Required()),
	), t.createTestCases)
	s.AddTool(mcp.NewTool("testify.testcase.update",
		mcp.WithDescription("Update a test case as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID"), mcp.Required()),
		mcp.WithString("title", mcp.Description("New title")),
		mcp.WithString("objective", mcp.Description("New objective")),
		mcp.WithString("preconditions", mcp.Description("New preconditions")),
		mcp.WithString("priority", mcp.Enum("low", "medium", "high", "critical")),
		mcp.WithString("module_id", mcp.Description("New module UUID")),
	), t.updateTestCase)
	s.AddTool(mcp.NewTool("testify.testcase.duplicate",
		mcp.WithDescription("Duplicate a test case as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID to duplicate"), mcp.Required()),
		mcp.WithString("new_title", mcp.Description("Optional title for the copy")),
	), t.duplicateTestCase)
	s.AddTool(mcp.NewTool("testify.testcase.archive",
		mcp.WithDescription("Archive (soft-delete) a test case as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(true),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID to archive"), mcp.Required()),
	), t.archiveTestCase)

	// test plan
	s.AddTool(mcp.NewTool("testify.testplan.create",
		mcp.WithDescription("Create a test plan as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("name", mcp.Description("Test plan name"), mcp.Required()),
		mcp.WithString("description", mcp.Description("Test plan description")),
	), t.createTestPlan)
	s.AddTool(mcp.NewTool("testify.testplan.addCases",
		mcp.WithDescription("Add test cases to a test plan's scope as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID"), mcp.Required()),
		mcp.WithArray("testcase_ids", mcp.Description("Test case UUIDs, maximum 100"), mcp.WithStringItems(), mcp.MaxItems(100), mcp.Required()),
	), t.addTestPlanCases)
	s.AddTool(mcp.NewTool("testify.testplan.removeCases",
		mcp.WithDescription("Remove test cases from a test plan's scope as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID"), mcp.Required()),
		mcp.WithArray("testcase_ids", mcp.Description("Test case UUIDs, maximum 100"), mcp.WithStringItems(), mcp.MaxItems(100), mcp.Required()),
	), t.removeTestPlanCases)
	s.AddTool(mcp.NewTool("testify.testplan.approve",
		mcp.WithDescription("Approve a test plan for execution. Human-gate action: requires an explicit_approval literal of true and an approver_id; nothing is approved implicitly."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID to approve"), mcp.Required()),
		mcp.WithString("approver_id", mcp.Description("Profile UUID of the human approver"), mcp.Required()),
		mcp.WithBoolean("explicit_approval", mcp.Description("Must be the literal value true; anything else is rejected"), mcp.Required()),
	), t.approveTestPlan)
	s.AddTool(mcp.NewTool("testify.testplan.changeStatus",
		mcp.WithDescription("Change a test plan's status directly (draft/active/completed/archived). Use testify.testplan.approve instead for the human-gated draft->active transition."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID"), mcp.Required()),
		mcp.WithString("status", mcp.Enum("draft", "active", "completed", "archived"), mcp.Required()),
	), t.changeTestPlanStatus)

	// test run
	s.AddTool(mcp.NewTool("testify.testrun.create",
		mcp.WithDescription("Start a new test run for a plan (or an unplanned set of cases) as a review-only draft. Always creates a fresh run with not_run results; it never overwrites an existing run."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("name", mcp.Description("Test run name"), mcp.Required()),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID the run executes")),
		mcp.WithArray("testcase_ids", mcp.Description("Test case UUIDs for an unplanned run, maximum 100"), mcp.WithStringItems(), mcp.MaxItems(100)),
	), t.createTestRun)
	s.AddTool(mcp.NewTool("testify.testrun.recordResult",
		mcp.WithDescription("Record a result for a single test result as a review-only draft. Only allowed while the parent run is in_progress."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("result_id", mcp.Description("Test result UUID to update"), mcp.Required()),
		mcp.WithString("status", mcp.Enum("pass", "fail", "skip", "blocked", "not_run"), mcp.Required()),
		mcp.WithString("tester_id", mcp.Description("Profile UUID who executed the result"), mcp.Required()),
		mcp.WithString("notes", mcp.Description("Optional execution notes")),
	), t.recordTestResult)
	s.AddTool(mcp.NewTool("testify.testrun.complete",
		mcp.WithDescription("Manually complete a test run. Human-gate action: completion is never inferred automatically from all results being filled."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID to complete"), mcp.Required()),
	), t.completeTestRun)
	s.AddTool(mcp.NewTool("testify.testrun.reopen",
		mcp.WithDescription("Reopen a completed test run back to in_progress."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("testrun_id", mcp.Description("Test run UUID to reopen"), mcp.Required()),
	), t.reopenTestRun)

	// issue
	s.AddTool(mcp.NewTool("testify.issue.create",
		mcp.WithDescription("File an issue linked to a test result as a review-only draft."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("test_result_id", mcp.Description("Test result UUID the issue is filed against"), mcp.Required()),
		mcp.WithString("title", mcp.Description("Issue title"), mcp.Required()),
		mcp.WithString("description", mcp.Description("Issue description")),
		mcp.WithString("type", mcp.Enum("bug", "feature", "improvement", "task")),
		mcp.WithString("priority", mcp.Enum("low", "medium", "high", "critical")),
		mcp.WithString("module_id", mcp.Description("Optional module UUID")),
	), t.createIssue)
	s.AddTool(mcp.NewTool("testify.issue.updateStatus",
		mcp.WithDescription("Transition an issue's status."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("issue_id", mcp.Description("Issue UUID"), mcp.Required()),
		mcp.WithString("status", mcp.Enum("backlog", "open", "in_progress", "resolved", "verified", "closed", "rejected", "duplicate"), mcp.Required()),
	), t.updateIssueStatus)
	s.AddTool(mcp.NewTool("testify.issue.assign",
		mcp.WithDescription("Assign (or unassign, by omitting assigned_to) an issue."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("project_id", mcp.Description("Optional project ID; must match the scoped session")),
		mcp.WithString("issue_id", mcp.Description("Issue UUID"), mcp.Required()),
		mcp.WithString("assigned_to", mcp.Description("Profile UUID of the new assignee; omit or empty to unassign")),
	), t.assignIssue)

	return nil
}

// reviewOnly wraps a mutation payload in the review-only draft envelope that
// Node writeService returns for every non-human-gate write. It signals to the
// client that the change is staged, not final.
func reviewOnly(data any) map[string]any {
	return map[string]any{
		"status": "draft",
		"mode":   "review_only",
		"data":   data,
	}
}

// beginWrite is the common preamble for every write handler: resolve the
// session, gate the scope, and validate any project references in the args.
// It returns a nil session only when an error result has already been built.
func (t *WriteTools) beginWrite(ctx context.Context, req mcp.CallToolRequest, scope core.TokenScope) (*auth.Session, *mcp.CallToolResult) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return nil, mcp.NewToolResultError(err.Error())
	}
	if err := EnsureWriteScope(session, scope); err != nil {
		return nil, mcp.NewToolResultError(err.Error())
	}
	if err := session.AssertProjectReferences(req.GetArguments()); err != nil {
		return nil, mcp.NewToolResultError(err.Error())
	}
	return session, nil
}

// ---------------------------------------------------------------------------
// test case
// ---------------------------------------------------------------------------

// createCaseArg mirrors one item of the cases array for createBulk.
type createCaseArg struct {
	Title          string `json:"title"`
	ModuleID       string `json:"module_id"`
	Objective      string `json:"objective"`
	Precondition   string `json:"preconditions"`
	Steps          string `json:"steps"`
	ExpectedResult string `json:"expected_result"`
	StepType       string `json:"step_type"`
	Priority       string `json:"priority"`
	Notes          string `json:"notes"`
	TargetRoleID   string `json:"target_role_id"`
}

func (t *WriteTools) createTestCases(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestCase)
	if errResult != nil {
		return errResult, nil
	}

	cases, err := decodeCaseBatch(req.GetArguments()["cases"])
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if len(cases) == 0 {
		return mcp.NewToolResultError("cases must contain at least one test case"), nil
	}
	if len(cases) > 100 {
		return mcp.NewToolResultErrorf("cases batch exceeds the maximum of 100 (got %d)", len(cases)), nil
	}

	created := make([]core.TestCase, 0, len(cases))
	for i := range cases {
		arg := cases[i]
		if arg.Title == "" {
			return mcp.NewToolResultErrorf("cases[%d].title is required", i), nil
		}
		priority := core.PriorityMedium
		if arg.Priority != "" {
			if !validPriority(arg.Priority) {
				return mcp.NewToolResultErrorf("cases[%d].priority must be one of: low, medium, high, critical", i), nil
			}
			priority = core.TestCasePriority(arg.Priority)
		}
		stepType := core.StepSimple
		if arg.StepType != "" {
			if !validStepType(arg.StepType) {
				return mcp.NewToolResultErrorf("cases[%d].step_type must be one of: simple, detailed", i), nil
			}
			stepType = core.StepType(arg.StepType)
		}
		var moduleID *string
		if arg.ModuleID != "" {
			if !isUUID(arg.ModuleID) {
				return mcp.NewToolResultErrorf("cases[%d].module_id must be a valid UUID", i), nil
			}
			moduleID = &arg.ModuleID
		}
		var targetRoleID *string
		if arg.TargetRoleID != "" {
			if !isUUID(arg.TargetRoleID) {
				return mcp.NewToolResultErrorf("cases[%d].target_role_id must be a valid UUID", i), nil
			}
			targetRoleID = &arg.TargetRoleID
		}
		tc, err := t.reg.Services.TestCase.Create(ctx, core.CreateTestCaseInput{
			ProjectID:      session.ProjectID,
			Title:          arg.Title,
			Objective:      strPtrIfNonEmpty(arg.Objective),
			Preconditions:  strPtrIfNonEmpty(arg.Precondition),
			Steps:          arg.Steps,
			ExpectedResult: strPtrIfNonEmpty(arg.ExpectedResult),
			Priority:       priority,
			StepType:       stepType,
			ModuleID:       moduleID,
			Notes:          strPtrIfNonEmpty(arg.Notes),
			TargetRoleID:   targetRoleID,
		})
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		created = append(created, *tc)
	}

	return mcp.NewToolResultStructured(reviewOnly(created), fmt.Sprintf("%d test case(s) staged as draft", len(created))), nil
}

func (t *WriteTools) updateTestCase(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestCase)
	if errResult != nil {
		return errResult, nil
	}

	testCaseID, err := req.RequireString("testcase_id")
	if err != nil || !isUUID(testCaseID) {
		return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
	}

	input := core.UpdateTestCaseInput{}
	if raw := req.GetString("title", ""); raw != "" {
		input.Title = &raw
	}
	if raw := req.GetString("objective", ""); raw != "" {
		input.Objective = &raw
	}
	if raw := req.GetString("preconditions", ""); raw != "" {
		input.Preconditions = &raw
	}
	if raw := req.GetString("priority", ""); raw != "" {
		if !validPriority(raw) {
			return mcp.NewToolResultError("priority must be one of: low, medium, high, critical"), nil
		}
		p := core.TestCasePriority(raw)
		input.Priority = &p
	}
	if raw := req.GetString("module_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("module_id must be a valid UUID"), nil
		}
		input.ModuleID = &raw
	}

	tc, err := t.reg.Services.TestCase.Update(ctx, testCaseID, input)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tc.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test case not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(tc), "test case update staged as draft"), nil
}

func (t *WriteTools) duplicateTestCase(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestCase)
	if errResult != nil {
		return errResult, nil
	}

	testCaseID, err := req.RequireString("testcase_id")
	if err != nil || !isUUID(testCaseID) {
		return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
	}

	tc, err := t.reg.Services.TestCase.Duplicate(ctx, testCaseID, req.GetString("new_title", ""))
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tc.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test case not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(tc), "test case duplication staged as draft"), nil
}

func (t *WriteTools) archiveTestCase(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestCase)
	if errResult != nil {
		return errResult, nil
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
	if err := t.reg.Services.TestCase.Archive(ctx, testCaseID, session.Identity.CreatedBy, session.ProjectID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(map[string]string{"id": testCaseID, "status": string(core.TestCaseStatusArchived)}), "test case archive staged as draft"), nil
}

// ---------------------------------------------------------------------------
// test plan
// ---------------------------------------------------------------------------

func (t *WriteTools) createTestPlan(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestPlan)
	if errResult != nil {
		return errResult, nil
	}

	name, err := req.RequireString("name")
	if err != nil || name == "" {
		return mcp.NewToolResultError("name is required"), nil
	}

	tp, err := t.reg.Services.TestPlan.Create(ctx, core.CreateTestPlanInput{
		ProjectID:   session.ProjectID,
		Name:        name,
		Description: strPtrIfNonEmpty(req.GetString("description", "")),
		Status:      core.PlanDraft,
	})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(tp), "test plan creation staged as draft"), nil
}

func (t *WriteTools) addTestPlanCases(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestPlan)
	if errResult != nil {
		return errResult, nil
	}

	testPlanID, err := req.RequireString("testplan_id")
	if err != nil || !isUUID(testPlanID) {
		return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
	}

	ids, err := requireUUIDSlice(req.GetArguments()["testcase_ids"], "testcase_ids")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if len(ids) > 100 {
		return mcp.NewToolResultErrorf("testcase_ids exceeds the maximum of 100 (got %d)", len(ids)), nil
	}

	tp, err := t.reg.Services.TestPlan.Get(ctx, testPlanID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tp.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test plan not found in the scoped project"), nil
	}
	if err := t.reg.Services.TestPlan.AddCases(ctx, testPlanID, ids); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(map[string]any{"testplan_id": testPlanID, "added": len(ids)}), "test plan scope update staged as draft"), nil
}

func (t *WriteTools) removeTestPlanCases(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestPlan)
	if errResult != nil {
		return errResult, nil
	}

	testPlanID, err := req.RequireString("testplan_id")
	if err != nil || !isUUID(testPlanID) {
		return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
	}

	ids, err := requireUUIDSlice(req.GetArguments()["testcase_ids"], "testcase_ids")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if len(ids) > 100 {
		return mcp.NewToolResultErrorf("testcase_ids exceeds the maximum of 100 (got %d)", len(ids)), nil
	}

	tp, err := t.reg.Services.TestPlan.Get(ctx, testPlanID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tp.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test plan not found in the scoped project"), nil
	}
	if err := t.reg.Services.TestPlan.RemoveCases(ctx, testPlanID, ids); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(map[string]any{"testplan_id": testPlanID, "removed": len(ids)}), "test plan scope update staged as draft"), nil
}

func (t *WriteTools) approveTestPlan(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestPlan)
	if errResult != nil {
		return errResult, nil
	}

	testPlanID, err := req.RequireString("testplan_id")
	if err != nil || !isUUID(testPlanID) {
		return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
	}
	approverID, err := req.RequireString("approver_id")
	if err != nil || !isUUID(approverID) {
		return mcp.NewToolResultError("approver_id must be a valid UUID"), nil
	}

	// Human gate: the caller must pass the literal true. mcp-go GetBool is
	// lenient about JSON true vs "true", so we require the boolean variant and
	// reject everything else (missing, false, string) explicitly.
	explicitApproval, ok := boolLiteral(req.GetArguments()["explicit_approval"])
	if !ok || !explicitApproval {
		return mcp.NewToolResultError("explicit_approval must be the literal value true to approve a test plan"), nil
	}

	tp, err := t.reg.Services.TestPlan.Get(ctx, testPlanID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tp.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test plan not found in the scoped project"), nil
	}
	if err := t.reg.Services.TestPlan.Approve(ctx, testPlanID, approverID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(tp, "test plan approved"), nil
}

func (t *WriteTools) changeTestPlanStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestPlan)
	if errResult != nil {
		return errResult, nil
	}

	testPlanID, err := req.RequireString("testplan_id")
	if err != nil || !isUUID(testPlanID) {
		return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
	}
	status, err := req.RequireString("status")
	if err != nil || !validTestPlanStatus(status) {
		return mcp.NewToolResultError("status must be one of: draft, active, completed, archived"), nil
	}

	tp, err := t.reg.Services.TestPlan.Get(ctx, testPlanID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if tp.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("test plan not found in the scoped project"), nil
	}
	actorID := session.Identity.CreatedBy
	if err := t.reg.Services.TestPlan.ChangeStatus(ctx, testPlanID, core.TestPlanStatus(status), actorID, session.ProjectID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(map[string]string{"id": testPlanID, "status": status}), "test plan status changed"), nil
}

// ---------------------------------------------------------------------------
// test run
// ---------------------------------------------------------------------------

func (t *WriteTools) createTestRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestRun)
	if errResult != nil {
		return errResult, nil
	}

	name, err := req.RequireString("name")
	if err != nil || name == "" {
		return mcp.NewToolResultError("name is required"), nil
	}

	input := core.CreateTestRunInput{ProjectID: session.ProjectID, Name: name}
	if raw := req.GetString("testplan_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
		}
		input.TestPlanID = &raw
	}
	if raw, ok := req.GetArguments()["testcase_ids"]; ok && raw != nil {
		ids, err := requireUUIDSlice(raw, "testcase_ids")
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		if len(ids) > 100 {
			return mcp.NewToolResultErrorf("testcase_ids exceeds the maximum of 100 (got %d)", len(ids)), nil
		}
		input.CaseIDs = ids
	}

	tr, err := t.reg.Services.TestRun.Create(ctx, input)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(tr), "test run creation staged as draft"), nil
}

func (t *WriteTools) recordTestResult(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	_, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestRun)
	if errResult != nil {
		return errResult, nil
	}

	resultID, err := req.RequireString("result_id")
	if err != nil || !isUUID(resultID) {
		return mcp.NewToolResultError("result_id must be a valid UUID"), nil
	}
	status, err := req.RequireString("status")
	if err != nil || !validResultStatus(status) {
		return mcp.NewToolResultError("status must be one of: pass, fail, skip, blocked, not_run"), nil
	}
	testerID, err := req.RequireString("tester_id")
	if err != nil || !isUUID(testerID) {
		return mcp.NewToolResultError("tester_id must be a valid UUID"), nil
	}

	var notes *string
	if raw := req.GetString("notes", ""); raw != "" {
		notes = &raw
	}

	if err := t.reg.Services.TestRun.RecordResult(ctx, resultID, core.RecordResultInput{
		Status:   core.TestResultStatus(status),
		TesterID: testerID,
		Notes:    notes,
	}); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(map[string]any{"result_id": resultID, "status": status, "tester_id": testerID}), "test result recording staged as draft"), nil
}

func (t *WriteTools) completeTestRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestRun)
	if errResult != nil {
		return errResult, nil
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
	if err := t.reg.Services.TestRun.Complete(ctx, testRunID, session.Identity.CreatedBy, session.ProjectID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(tr, "test run completed"), nil
}

func (t *WriteTools) reopenTestRun(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteTestRun)
	if errResult != nil {
		return errResult, nil
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
	if err := t.reg.Services.TestRun.Reopen(ctx, testRunID, session.Identity.CreatedBy, session.ProjectID); err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(tr, "test run reopened"), nil
}

// ---------------------------------------------------------------------------
// issue
// ---------------------------------------------------------------------------

func (t *WriteTools) createIssue(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteIssue)
	if errResult != nil {
		return errResult, nil
	}

	testResultID, err := req.RequireString("test_result_id")
	if err != nil || !isUUID(testResultID) {
		return mcp.NewToolResultError("test_result_id must be a valid UUID"), nil
	}
	title, err := req.RequireString("title")
	if err != nil || title == "" {
		return mcp.NewToolResultError("title is required"), nil
	}

	issueType := core.IssueBug
	if raw := req.GetString("type", ""); raw != "" {
		if !validIssueType(raw) {
			return mcp.NewToolResultError("type must be one of: bug, feature, improvement, task"), nil
		}
		issueType = core.IssueType(raw)
	}
	priority := core.IssuePriorityMedium
	if raw := req.GetString("priority", ""); raw != "" {
		if !validIssuePriority(raw) {
			return mcp.NewToolResultError("priority must be one of: low, medium, high, critical"), nil
		}
		priority = core.IssuePriority(raw)
	}
	var moduleID *string
	if raw := req.GetString("module_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("module_id must be a valid UUID"), nil
		}
		moduleID = &raw
	}

	iss, err := t.reg.Services.Issue.Create(ctx, core.CreateIssueInput{
		ProjectID:    session.ProjectID,
		TestResultID: testResultID,
		Title:        title,
		Description:  strPtrIfNonEmpty(req.GetString("description", "")),
		Type:         issueType,
		Priority:     priority,
		ModuleID:     moduleID,
	})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(reviewOnly(iss), "issue creation staged as draft"), nil
}

func (t *WriteTools) updateIssueStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteIssue)
	if errResult != nil {
		return errResult, nil
	}

	issueID, err := req.RequireString("issue_id")
	if err != nil || !isUUID(issueID) {
		return mcp.NewToolResultError("issue_id must be a valid UUID"), nil
	}
	status, err := req.RequireString("status")
	if err != nil || !validIssueStatus(status) {
		return mcp.NewToolResultError("status must be one of: backlog, open, in_progress, resolved, verified, closed, rejected, duplicate"), nil
	}

	actorID := session.Identity.CreatedBy
	iss, err := t.reg.Services.Issue.UpdateStatus(ctx, issueID, core.IssueStatus(status), actorID, session.ProjectID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if iss.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("issue not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(iss,
		fmt.Sprintf("issue %s (%s): status changed to %s (actor: %s)",
			iss.Code, iss.Title, iss.Status, actorID)), nil
}

func (t *WriteTools) assignIssue(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteIssue)
	if errResult != nil {
		return errResult, nil
	}

	issueID, err := req.RequireString("issue_id")
	if err != nil || !isUUID(issueID) {
		return mcp.NewToolResultError("issue_id must be a valid UUID"), nil
	}
	assignedTo := strPtrIfNonEmpty(req.GetString("assigned_to", ""))
	if assignedTo != nil && !isUUID(*assignedTo) {
		return mcp.NewToolResultError("assigned_to must be a valid UUID"), nil
	}

	actorID := session.Identity.CreatedBy
	iss, err := t.reg.Services.Issue.Assign(ctx, issueID, assignedTo, actorID, session.ProjectID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if iss.ProjectID != session.ProjectID {
		return mcp.NewToolResultError("issue not found in the scoped project"), nil
	}
	return mcp.NewToolResultStructured(iss,
		fmt.Sprintf("issue %s (%s): assignee changed (actor: %s)", iss.Code, iss.Title, actorID)), nil
}

// ---------------------------------------------------------------------------
// argument decoding helpers
// ---------------------------------------------------------------------------

// decodeCaseBatch unmarshals the "cases" array argument (a JSON array of
// objects) into createCaseArg entries. mcp-go has no typed object-array
// accessor, so the raw JSON value is re-encoded and decoded here.
func decodeCaseBatch(raw any) ([]createCaseArg, error) {
	if raw == nil {
		return nil, fmt.Errorf("cases is required")
	}
	b, err := json.Marshal(raw)
	if err != nil {
		return nil, fmt.Errorf("cases: %w", err)
	}
	var out []createCaseArg
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, fmt.Errorf("cases must be an array of objects: %w", err)
	}
	return out, nil
}

// requireUUIDSlice extracts a []string of UUIDs from an array argument,
// rejecting entries that are not valid UUIDs.
func requireUUIDSlice(raw any, name string) ([]string, error) {
	arr, ok := raw.([]any)
	if !ok {
		return nil, fmt.Errorf("%s must be an array of strings", name)
	}
	out := make([]string, 0, len(arr))
	for i, item := range arr {
		s, ok := item.(string)
		if !ok || !isUUID(s) {
			return nil, fmt.Errorf("%s[%d] must be a valid UUID", name, i)
		}
		out = append(out, s)
	}
	return out, nil
}

// requireStringSlice extracts a []string from an array argument, enforcing
// per-item length bounds and a maximum item count.
func requireStringSlice(raw any, name string, itemMin, itemMax, maxItems int) ([]string, error) {
	arr, ok := raw.([]any)
	if !ok {
		return nil, fmt.Errorf("%s must be an array of strings", name)
	}
	if len(arr) > maxItems {
		return nil, fmt.Errorf("%s exceeds the maximum of %d items (got %d)", name, maxItems, len(arr))
	}
	out := make([]string, 0, len(arr))
	for i, item := range arr {
		s, ok := item.(string)
		if !ok {
			return nil, fmt.Errorf("%s[%d] must be a string", name, i)
		}
		if len(s) < itemMin || len(s) > itemMax {
			return nil, fmt.Errorf("%s[%d] length must be between %d and %d", name, i, itemMin, itemMax)
		}
		out = append(out, s)
	}
	return out, nil
}

// boolLiteral returns the boolean value of an argument only when it was
// passed as a JSON true/false literal. String "true"/"false" is rejected so
// the human gate cannot be satisfied by a sloppy string.
func boolLiteral(raw any) (bool, bool) {
	b, ok := raw.(bool)
	return b, ok
}

func validIssueType(s string) bool {
	switch core.IssueType(s) {
	case core.IssueBug, core.IssueFeature, core.IssueImprovement, core.IssueTask:
		return true
	}
	return false
}
