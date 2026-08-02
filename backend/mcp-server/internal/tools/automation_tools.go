package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/mcp-server/internal/auth"
)

// AutomationTools registers the Playwright local-runner orchestration tools
// (Epic 5 / BACKLOG.md). Ported from automationTools.ts:
//
//   - job_status / runner_list are read-only, session-scoped.
//   - map_script / enqueue are write tools gated on write:automation.
//   - rerun_failed is also write:automation but carries a human gate like
//     testplan.approve: above the safety limit (selection_limit) it does not
//     run unless confirmed_by + explicit_confirmation (literal true) are
//     given — mirroring the reference RPC's INVALID_HUMAN_CONFIRMER check.
//
// Unlike the Epic 3 write tools, these return their action result directly
// (no review-only envelope): map_script upserts a mapping and enqueue creates
// an actual run + jobs, matching the Node reference behaviour.
type AutomationTools struct {
	reg *Registry
}

func (t *AutomationTools) Name() string { return "automation" }

func (t *AutomationTools) Register(s ToolAdder) error {
	s.AddTool(mcp.NewTool("testify.automation.job_status",
		mcp.WithDescription("Get the current queued/running/passed/failed automation job status."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("job_id", mcp.Description("Automation job UUID"), mcp.Required()),
	), t.jobStatus)
	s.AddTool(mcp.NewTool("testify.automation.runner_list",
		mcp.WithDescription("List project runners, labels/capabilities, and computed online/offline state."),
		mcp.WithReadOnlyHintAnnotation(true), mcp.WithIdempotentHintAnnotation(true),
		mcp.WithDestructiveHintAnnotation(false),
	), t.runnerList)
	s.AddTool(mcp.NewTool("testify.automation.map_script",
		mcp.WithDescription("Create or replace a Test Case to local script reference mapping and runner labels."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID"), mcp.Required()),
		mcp.WithString("script_ref", mcp.Description("Script path/spec id on the runner, 1-500 chars"), mcp.Required()),
		mcp.WithArray("runner_labels", mcp.Description("Capabilities the runner must have, maximum 20 items"), mcp.WithStringItems(), mcp.MaxItems(20)),
	), t.mapScript)
	s.AddTool(mcp.NewTool("testify.automation.enqueue",
		mcp.WithDescription("Create a new automation run and enqueue jobs for exactly one Test Case or Test Plan, routed by runner labels."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("testcase_id", mcp.Description("Test case UUID to run (exactly one of testcase_id/testplan_id)")),
		mcp.WithString("testplan_id", mcp.Description("Test plan UUID to run (exactly one of testcase_id/testplan_id)")),
		mcp.WithString("name", mcp.Description("Run name, 1-200 chars")),
		mcp.WithArray("runner_labels", mcp.Description("Additional routing labels, maximum 20 items"), mcp.WithStringItems(), mcp.MaxItems(20)),
		mcp.WithNumber("max_attempts", mcp.Description("Attempts per job, 1-10"), mcp.Min(1), mcp.Max(10)),
	), t.enqueue)
	s.AddTool(mcp.NewTool("testify.automation.rerun_failed",
		mcp.WithDescription("Create a selective regression run for a resolved Issue. Selects the failed case plus cases sharing its module or tags. Above the safety limit it returns a confirmation request; retry only after a human project member confirms."),
		mcp.WithReadOnlyHintAnnotation(false), mcp.WithIdempotentHintAnnotation(false),
		mcp.WithDestructiveHintAnnotation(false),
		mcp.WithString("issue_id", mcp.Description("Resolved Issue UUID that drives the selection"), mcp.Required()),
		mcp.WithString("name", mcp.Description("Run name, 1-200 chars")),
		mcp.WithArray("runner_labels", mcp.Description("Additional routing labels, maximum 20 items"), mcp.WithStringItems(), mcp.MaxItems(20)),
		mcp.WithNumber("max_attempts", mcp.Description("Attempts per job, 1-10"), mcp.Min(1), mcp.Max(10)),
		mcp.WithNumber("selection_limit", mcp.Description("Safety limit before human confirmation is required, 1-500"), mcp.Min(1), mcp.Max(500)),
		mcp.WithString("confirmed_by", mcp.Description("Profile UUID of the human confirmer (required when above the safety limit)")),
		mcp.WithBoolean("explicit_confirmation", mcp.Description("Must be the literal value true to confirm above-limit selection")),
	), t.rerunFailed)

	return nil
}

// ---------------------------------------------------------------------------
// read tools
// ---------------------------------------------------------------------------

func (t *AutomationTools) jobStatus(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	jobID, err := req.RequireString("job_id")
	if err != nil || !isUUID(jobID) {
		return mcp.NewToolResultError("job_id must be a valid UUID"), nil
	}

	job, err := t.reg.Services.Automation.JobStatus(ctx, session.ProjectID, jobID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if job == nil {
		return mcp.NewToolResultStructured(map[string]string{"job_id": jobID}, "no automation job found with that id"), nil
	}
	return mcp.NewToolResultStructured(job, "automation job found"), nil
}

func (t *AutomationTools) runnerList(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, err := t.reg.SessionFor(ctx)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	runners, err := t.reg.Services.Automation.RunnerList(ctx, session.ProjectID)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(runners, fmt.Sprintf("%d runner(s) found", len(runners))), nil
}

// ---------------------------------------------------------------------------
// write tools
// ---------------------------------------------------------------------------

func (t *AutomationTools) mapScript(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteAutomation)
	if errResult != nil {
		return errResult, nil
	}

	testCaseID, err := req.RequireString("testcase_id")
	if err != nil || !isUUID(testCaseID) {
		return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
	}
	scriptRef, err := req.RequireString("script_ref")
	if err != nil || strings.TrimSpace(scriptRef) == "" {
		return mcp.NewToolResultError("script_ref is required"), nil
	}
	labels, err := optionalLabels(req.GetArguments()["runner_labels"])
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	script, err := t.reg.Services.Automation.MapScript(ctx, core.MapScriptInput{
		ProjectID:    session.ProjectID,
		TestCaseID:   testCaseID,
		ScriptRef:    scriptRef,
		RunnerLabels: labels,
		CreatedBy:    session.Identity.CreatedBy,
	})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(script, "script mapping saved"), nil
}

func (t *AutomationTools) enqueue(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteAutomation)
	if errResult != nil {
		return errResult, nil
	}

	name := req.GetString("name", "")
	if len(name) > 200 {
		return mcp.NewToolResultError("name must be at most 200 characters"), nil
	}
	labels, err := optionalLabels(req.GetArguments()["runner_labels"])
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	input := core.AutomationEnqueueInput{
		ProjectID:    session.ProjectID,
		Name:         name,
		RunnerLabels: labels,
		MaxAttempts:  req.GetInt("max_attempts", 1),
		CreatedBy:    session.Identity.CreatedBy,
	}
	if raw := req.GetString("testcase_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testcase_id must be a valid UUID"), nil
		}
		input.TestCaseID = &raw
	}
	if raw := req.GetString("testplan_id", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("testplan_id must be a valid UUID"), nil
		}
		input.TestPlanID = &raw
	}

	result, err := t.reg.Services.Automation.Enqueue(ctx, input)
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("enqueued %d job(s) in run %s", result.JobCount, result.RunID)), nil
}

func (t *AutomationTools) rerunFailed(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	session, errResult := t.beginWrite(ctx, req, core.ScopeWriteAutomation)
	if errResult != nil {
		return errResult, nil
	}

	issueID, err := req.RequireString("issue_id")
	if err != nil || !isUUID(issueID) {
		return mcp.NewToolResultError("issue_id must be a valid UUID"), nil
	}
	name := req.GetString("name", "")
	if len(name) > 200 {
		return mcp.NewToolResultError("name must be at most 200 characters"), nil
	}
	labels, err := optionalLabels(req.GetArguments()["runner_labels"])
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	var confirmedBy *string
	if raw := req.GetString("confirmed_by", ""); raw != "" {
		if !isUUID(raw) {
			return mcp.NewToolResultError("confirmed_by must be a valid UUID"), nil
		}
		confirmedBy = &raw
	}
	explicitConfirmation := false
	if raw, ok := req.GetArguments()["explicit_confirmation"]; ok && raw != nil {
		b, ok := boolLiteral(raw)
		if !ok {
			return mcp.NewToolResultError("explicit_confirmation must be the boolean literal true or false"), nil
		}
		explicitConfirmation = b
	}

	result, err := t.reg.Services.Automation.RerunFailed(ctx, core.RerunFailedInput{
		ProjectID:            session.ProjectID,
		IssueID:              issueID,
		Name:                 name,
		RunnerLabels:         labels,
		MaxAttempts:          req.GetInt("max_attempts", 1),
		SelectionLimit:       req.GetInt("selection_limit", 25),
		ConfirmedBy:          confirmedBy,
		ExplicitConfirmation: explicitConfirmation,
		CreatedBy:            session.Identity.CreatedBy,
	})
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	if result.ConfirmationRequired {
		return mcp.NewToolResultStructured(result,
			fmt.Sprintf("selection of %d case(s) exceeds the safety limit of %d; retry with a human confirmation", result.SelectedCount, result.SelectionLimit)), nil
	}
	return mcp.NewToolResultStructured(result, fmt.Sprintf("enqueued %d job(s) in run %s", result.JobCount, result.RunID)), nil
}

// beginWrite is the automation write-tool preamble: session + write:automation
// scope + recursive project-reference assertion (same as WriteTools).
func (t *AutomationTools) beginWrite(ctx context.Context, req mcp.CallToolRequest, scope core.TokenScope) (*auth.Session, *mcp.CallToolResult) {
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

// optionalLabels extracts the optional runner_labels array argument: string
// items 1-80 chars, maximum 20 items. nil/absent -> empty slice.
func optionalLabels(raw any) ([]string, error) {
	if raw == nil {
		return nil, nil
	}
	return requireStringSlice(raw, "runner_labels", 1, 80, 20)
}
