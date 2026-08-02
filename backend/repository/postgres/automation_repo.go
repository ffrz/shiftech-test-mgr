package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

// AutomationRepo drives the Playwright local-runner orchestration tables.
// Ported from the Node mcp_*_automation RPCs (schema_055/056) — unlike the
// Node server it talks to Postgres directly (privileged connection), so the
// RPCs are plain queries and runner-token auth stays server-side.
type AutomationRepo struct {
	db      *gorm.DB
	runRepo *TestRunRepo
}

func NewAutomationRepo(db *gorm.DB) *AutomationRepo {
	return &AutomationRepo{db: db, runRepo: NewTestRunRepo(db)}
}

func (r *AutomationRepo) MapScript(ctx context.Context, input core.MapScriptInput) (*core.AutomationScript, error) {
	var exists bool
	if err := r.db.WithContext(ctx).Raw(
		`select exists (select 1 from test_cases where id = ? and project_id = ?)`,
		input.TestCaseID, input.ProjectID,
	).Scan(&exists).Error; err != nil {
		return nil, fmt.Errorf("automation mapscript check: %w", err)
	}
	if !exists {
		return nil, fmt.Errorf("TEST_CASE_NOT_FOUND")
	}

	var row automationScriptRow
	if err := r.db.WithContext(ctx).Raw(`
		insert into automation_scripts (project_id, test_case_id, script_ref, runner_labels, created_by, updated_at)
		values (?, ?, ?, ?, ?, now())
		on conflict (test_case_id) do update
			set script_ref = excluded.script_ref, runner_labels = excluded.runner_labels, updated_at = now()
		returning id, project_id, test_case_id, script_ref, runner_labels, created_at, updated_at
	`, input.ProjectID, input.TestCaseID, input.ScriptRef, pq.Array(input.RunnerLabels), input.CreatedBy,
	).Scan(&row).Error; err != nil {
		return nil, fmt.Errorf("automation mapscript: %w", err)
	}

	out := row.toDomain()
	return &out, nil
}

func (r *AutomationRepo) Enqueue(ctx context.Context, input core.AutomationEnqueueInput) (*core.AutomationEnqueueResult, error) {
	name := trimDefault(input.Name, "Automation run")

	runInput := core.CreateTestRunInput{
		ProjectID:  input.ProjectID,
		Name:       name,
		StartedBy:  &input.CreatedBy,
		TestPlanID: input.TestPlanID,
	}
	if input.TestCaseID != nil {
		runInput.CaseIDs = []string{*input.TestCaseID}
	}

	run, err := r.runRepo.Create(ctx, runInput)
	if err != nil {
		return nil, err
	}

	var scripts []automationScriptRow
	if input.TestPlanID != nil {
		if err := r.db.WithContext(ctx).Raw(`
			select s.id, s.project_id, s.test_case_id, s.script_ref, s.runner_labels, s.created_at, s.updated_at
			from automation_scripts s
			join test_plan_cases tpc on tpc.test_case_id = s.test_case_id and tpc.test_plan_id = ?
			where s.project_id = ?
			order by tpc."order", s.test_case_id
		`, *input.TestPlanID, input.ProjectID).Scan(&scripts).Error; err != nil {
			return nil, fmt.Errorf("automation enqueue scripts: %w", err)
		}
	} else if input.TestCaseID != nil {
		if err := r.db.WithContext(ctx).Raw(`
			select id, project_id, test_case_id, script_ref, runner_labels, created_at, updated_at
			from automation_scripts
			where project_id = ? and test_case_id = ?
		`, input.ProjectID, *input.TestCaseID).Scan(&scripts).Error; err != nil {
			return nil, fmt.Errorf("automation enqueue script: %w", err)
		}
		if len(scripts) == 0 {
			return nil, fmt.Errorf("AUTOMATION_SCRIPT_NOT_MAPPED")
		}
	}

	jobCount := 0
	now := time.Now()
	for _, s := range scripts {
		job := automationJobRow{
			ID:             newUUID(),
			ProjectID:      input.ProjectID,
			TestRunID:      run.ID,
			TestCaseID:     s.TestCaseID,
			ScriptRef:      s.ScriptRef,
			RequiredLabels: mergeLabels(s.RunnerLabels, input.RunnerLabels),
			Status:         string(core.JobQueued),
			Attempt:        0,
			MaxAttempts:    input.MaxAttempts,
			QueuedAt:       now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := r.db.WithContext(ctx).Create(&job).Error; err != nil {
			return nil, fmt.Errorf("automation enqueue job: %w", err)
		}
		jobCount++
	}

	return &core.AutomationEnqueueResult{RunID: run.ID, RunCode: run.Code, JobCount: jobCount}, nil
}

func (r *AutomationRepo) RerunFailed(ctx context.Context, input core.RerunFailedInput) (*core.RerunFailedResult, error) {
	var src struct {
		ID       string  `gorm:"column:id"`
		ModuleID *string `gorm:"column:module_id"`
	}
	if err := r.db.WithContext(ctx).Raw(`
		select tc.id, tc.module_id
		from issues i
		join test_results result on result.id = i.test_result_id
		join test_cases tc on tc.id = result.test_case_id
		where i.id = ? and i.status = 'resolved' and result.status = 'fail' and tc.project_id = ?
	`, input.IssueID, input.ProjectID).Scan(&src).Error; err != nil {
		return nil, fmt.Errorf("automation rerun source: %w", err)
	}
	if src.ID == "" {
		return nil, fmt.Errorf("RESOLVED_ISSUE_NOT_FOUND")
	}

	var moduleParam any
	if src.ModuleID != nil {
		moduleParam = *src.ModuleID
	}
	var caseIDs []string
	if err := r.db.WithContext(ctx).Raw(`
		select candidate.id
		from test_cases candidate
		join automation_scripts script on script.test_case_id = candidate.id and script.project_id = ?
		where candidate.project_id = ? and candidate.status = 'active' and (
			candidate.id = ?
			or (candidate.module_id is not null and candidate.module_id = ?)
			or exists (
				select 1 from test_case_tags source_tag
				join test_case_tags candidate_tag on candidate_tag.tag_id = source_tag.tag_id
				where source_tag.test_case_id = ? and candidate_tag.test_case_id = candidate.id
			)
		)
		order by candidate.code, candidate.id
	`, input.ProjectID, input.ProjectID, src.ID, moduleParam, src.ID).Scan(&caseIDs).Error; err != nil {
		return nil, fmt.Errorf("automation rerun candidates: %w", err)
	}
	if len(caseIDs) == 0 {
		return nil, fmt.Errorf("NO_RELEVANT_AUTOMATED_TESTS")
	}

	limit := input.SelectionLimit
	if limit <= 0 {
		limit = 25
	}
	if len(caseIDs) > limit {
		if !input.ExplicitConfirmation || input.ConfirmedBy == nil {
			return &core.RerunFailedResult{
				SelectedCount:        len(caseIDs),
				ConfirmationRequired: true,
				SelectionLimit:       limit,
			}, nil
		}
		ok, err := r.isValidHumanConfirmer(ctx, *input.ConfirmedBy, input.ProjectID)
		if err != nil {
			return nil, err
		}
		if !ok {
			return nil, fmt.Errorf("INVALID_HUMAN_CONFIRMER")
		}
	}

	name := trimDefault(input.Name, "Selective regression")
	run, err := r.runRepo.Create(ctx, core.CreateTestRunInput{
		ProjectID: input.ProjectID,
		Name:      name,
		StartedBy: &input.CreatedBy,
		CaseIDs:   caseIDs,
	})
	if err != nil {
		return nil, err
	}

	var scripts []automationScriptRow
	if err := r.db.WithContext(ctx).Raw(`
		select id, project_id, test_case_id, script_ref, runner_labels, created_at, updated_at
		from automation_scripts
		where project_id = ? and test_case_id = any(?)
	`, input.ProjectID, pq.Array(caseIDs)).Scan(&scripts).Error; err != nil {
		return nil, fmt.Errorf("automation rerun scripts: %w", err)
	}

	jobCount := 0
	now := time.Now()
	for _, s := range scripts {
		job := automationJobRow{
			ID:             newUUID(),
			ProjectID:      input.ProjectID,
			TestRunID:      run.ID,
			TestCaseID:     s.TestCaseID,
			ScriptRef:      s.ScriptRef,
			RequiredLabels: mergeLabels(s.RunnerLabels, input.RunnerLabels),
			Status:         string(core.JobQueued),
			Attempt:        0,
			MaxAttempts:    input.MaxAttempts,
			QueuedAt:       now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := r.db.WithContext(ctx).Create(&job).Error; err != nil {
			return nil, fmt.Errorf("automation rerun job: %w", err)
		}
		jobCount++
	}

	return &core.RerunFailedResult{
		RunID:            run.ID,
		RunCode:          run.Code,
		JobCount:         jobCount,
		SelectedCount:    len(caseIDs),
		SourceTestCaseID: src.ID,
		ConfirmationRequired: false,
		SelectionLimit:       limit,
	}, nil
}

func (r *AutomationRepo) JobStatus(ctx context.Context, projectID, jobID string) (*core.AutomationJob, error) {
	var row automationJobRow
	err := r.db.WithContext(ctx).Where("project_id = ? AND id = ?", projectID, jobID).First(&row).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("automation job status: %w", err)
	}
	out := row.toDomain()
	return &out, nil
}

func (r *AutomationRepo) RunnerList(ctx context.Context, projectID string) ([]core.AutomationRunner, error) {
	var rows []automationRunnerRow
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("automation runner list: %w", err)
	}
	out := make([]core.AutomationRunner, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

// isValidHumanConfirmer mirrors the reference RPC's INVALID_HUMAN_CONFIRMER
// guard: the confirming profile must exist, not be deleted, and be an admin,
// the project owner, or an accepted project member.
func (r *AutomationRepo) isValidHumanConfirmer(ctx context.Context, userID, projectID string) (bool, error) {
	var ok bool
	if err := r.db.WithContext(ctx).Raw(`
		select exists (
			select 1 from users u
			where u.id = ? and u.role in ('user', 'admin') and u.deleted_at is null
			  and (u.role = 'admin'
				or exists (select 1 from projects p where p.id = ? and p.owner_id = u.id)
				or exists (select 1 from project_members m where m.project_id = ? and m.user_id = u.id and m.status = 'accepted'))
		)
	`, userID, projectID, projectID).Scan(&ok).Error; err != nil {
		return false, fmt.Errorf("automation confirmer check: %w", err)
	}
	return ok, nil
}

// trimDefault trims whitespace and falls back to def when empty.
func trimDefault(s, def string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return def
	}
	return s
}

// mergeLabels returns the distinct union of script labels and caller labels,
// mirroring the reference RPC's runner_labels || p_runner_labels merge.
func mergeLabels(scriptLabels, extra []string) pq.StringArray {
	seen := make(map[string]struct{}, len(scriptLabels)+len(extra))
	out := make(pq.StringArray, 0, len(scriptLabels)+len(extra))
	for _, l := range scriptLabels {
		if l == "" {
			continue
		}
		if _, ok := seen[l]; ok {
			continue
		}
		seen[l] = struct{}{}
		out = append(out, l)
	}
	for _, l := range extra {
		if l == "" {
			continue
		}
		if _, ok := seen[l]; ok {
			continue
		}
		seen[l] = struct{}{}
		out = append(out, l)
	}
	return out
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type automationRunnerRow struct {
	ID          string        `gorm:"column:id"`
	ProjectID   string        `gorm:"column:project_id"`
	Name        string        `gorm:"column:name"`
	Labels      pq.StringArray `gorm:"column:labels"`
	TokenPrefix string        `gorm:"column:token_prefix"`
	Active      bool          `gorm:"column:active"`
	LastSeenAt  *time.Time    `gorm:"column:last_seen_at"`
	CreatedAt   time.Time     `gorm:"column:created_at"`
	UpdatedAt   time.Time     `gorm:"column:updated_at"`
}

func (automationRunnerRow) TableName() string { return "automation_runners" }

const runnerOnlineWindow = 90 * time.Second

func (r automationRunnerRow) toDomain() core.AutomationRunner {
	status := "offline"
	if r.Active && r.LastSeenAt != nil && time.Since(*r.LastSeenAt) <= runnerOnlineWindow {
		status = "online"
	}
	return core.AutomationRunner{
		ID:          r.ID,
		ProjectID:   r.ProjectID,
		Name:        r.Name,
		Labels:      []string(r.Labels),
		TokenPrefix: r.TokenPrefix,
		Active:      r.Active,
		LastSeenAt:  r.LastSeenAt,
		Status:      status,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

type automationScriptRow struct {
	ID           string         `gorm:"column:id"`
	ProjectID    string         `gorm:"column:project_id"`
	TestCaseID   string         `gorm:"column:test_case_id"`
	ScriptRef    string         `gorm:"column:script_ref"`
	RunnerLabels pq.StringArray `gorm:"column:runner_labels"`
	CreatedAt    time.Time      `gorm:"column:created_at"`
	UpdatedAt    time.Time      `gorm:"column:updated_at"`
}

func (automationScriptRow) TableName() string { return "automation_scripts" }

func (r automationScriptRow) toDomain() core.AutomationScript {
	return core.AutomationScript{
		ID:           r.ID,
		ProjectID:    r.ProjectID,
		TestCaseID:   r.TestCaseID,
		ScriptRef:    r.ScriptRef,
		RunnerLabels: []string(r.RunnerLabels),
		CreatedAt:    r.CreatedAt,
		UpdatedAt:    r.UpdatedAt,
	}
}

type automationJobRow struct {
	ID             string         `gorm:"column:id"`
	ProjectID      string         `gorm:"column:project_id"`
	TestRunID      string         `gorm:"column:test_run_id"`
	TestCaseID     string         `gorm:"column:test_case_id"`
	ScriptRef      string         `gorm:"column:script_ref"`
	RequiredLabels pq.StringArray `gorm:"column:required_labels"`
	Status         string         `gorm:"column:status"`
	Attempt        int            `gorm:"column:attempt"`
	MaxAttempts    int            `gorm:"column:max_attempts"`
	RunnerID       *string        `gorm:"column:runner_id"`
	ErrorMessage   *string        `gorm:"column:error_message"`
	QueuedAt       time.Time      `gorm:"column:queued_at"`
	StartedAt      *time.Time     `gorm:"column:started_at"`
	FinishedAt     *time.Time     `gorm:"column:finished_at"`
	CreatedAt      time.Time      `gorm:"column:created_at"`
	UpdatedAt      time.Time      `gorm:"column:updated_at"`
}

func (automationJobRow) TableName() string { return "automation_jobs" }

func (r automationJobRow) toDomain() core.AutomationJob {
	return core.AutomationJob{
		ID:             r.ID,
		ProjectID:      r.ProjectID,
		TestRunID:      r.TestRunID,
		TestCaseID:     r.TestCaseID,
		ScriptRef:      r.ScriptRef,
		RequiredLabels: []string(r.RequiredLabels),
		Status:         core.AutomationJobStatus(r.Status),
		Attempt:        r.Attempt,
		MaxAttempts:    r.MaxAttempts,
		RunnerID:       r.RunnerID,
		ErrorMessage:   r.ErrorMessage,
		QueuedAt:       r.QueuedAt,
		StartedAt:      r.StartedAt,
		FinishedAt:     r.FinishedAt,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
}
