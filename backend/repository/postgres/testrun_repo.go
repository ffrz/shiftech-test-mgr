package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TestRunRepo struct {
	db *gorm.DB
}

func NewTestRunRepo(db *gorm.DB) *TestRunRepo {
	return &TestRunRepo{db: db}
}

func (r *TestRunRepo) List(ctx context.Context, filter core.TestRunFilter) (*core.PageResult[core.TestRun], error) {
	var rows []testRunRow
	q := r.db.WithContext(ctx).Where("project_id = ?", filter.ProjectID)

	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.PlanID != nil {
		q = q.Where("test_plan_id = ?", *filter.PlanID)
	}
	if filter.TesterID != nil {
		q = q.Where("started_by = ?", *filter.TesterID)
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	if filter.Cursor != nil {
		if decoded, err := decodeCodeCursor(*filter.Cursor); err == nil {
			q = q.Where("(code, id) > (?, ?)", decoded.Code, decoded.ID)
		}
	}

	q = q.Order("code, id").Limit(limit + 1)

	if err := q.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testrun list: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]core.TestRun, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}

	var nextCursor string
	if hasMore && len(rows) > 0 {
		last := rows[len(rows)-1]
		nextCursor = encodeCodeCursor(last.Code, last.ID)
	}

	var total int64
	r.db.WithContext(ctx).Model(&testRunRow{}).Where("project_id = ?", filter.ProjectID).Count(&total)

	return &core.PageResult[core.TestRun]{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      int(total),
	}, nil
}

func (r *TestRunRepo) Get(ctx context.Context, id string) (*core.TestRun, error) {
	var row testRunRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testrun get: %w", err)
	}
	tr := row.toDomain()
	return &tr, nil
}

func (r *TestRunRepo) Create(ctx context.Context, input core.CreateTestRunInput) (*core.TestRun, error) {
	now := time.Now()
	row := testRunRow{
		ID:        newUUID(),
		ProjectID: input.ProjectID,
		Name:      input.Name,
		Status:    string(core.RunInProgress),
		StartedAt: now,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if input.PlanID != nil && *input.PlanID != "" {
		row.PlanID = input.PlanID
	}

	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("testrun create: %w", err)
	}

	if err := r.db.WithContext(ctx).Where("id = ?", row.ID).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testrun create fetch: %w", err)
	}

	var caseIDs []string
	if input.PlanID != nil && *input.PlanID != "" {
		var links []testPlanCaseRow
		r.db.WithContext(ctx).Where("test_plan_id = ?", *input.PlanID).Find(&links)
		for _, l := range links {
			caseIDs = append(caseIDs, l.TestCaseID)
		}
	} else if len(input.CaseIDs) > 0 {
		caseIDs = input.CaseIDs
	}

	if len(caseIDs) > 0 {
		if err := r.seedResults(ctx, row.ID, caseIDs); err != nil {
			return nil, err
		}
	}

	tr := row.toDomain()
	return &tr, nil
}

func (r *TestRunRepo) RecordResult(ctx context.Context, resultID string, input core.RecordResultInput) error {
	updates := map[string]interface{}{
		"status":      string(input.Status),
		"tester_id":   input.TesterID,
		"updated_at":  time.Now(),
		"executed_at": time.Now(),
	}
	if input.Notes != nil {
		updates["notes"] = *input.Notes
	}
	return r.db.WithContext(ctx).Model(&testResultRow{}).Where("id = ?", resultID).Updates(updates).Error
}

func (r *TestRunRepo) Complete(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).Model(&testRunRow{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":       string(core.RunCompleted),
		"completed_at": now,
		"updated_at":   now,
	}).Error
}

func (r *TestRunRepo) Summary(ctx context.Context, id string) (*core.RunSummary, error) {
	var summary core.RunSummary
	err := r.db.WithContext(ctx).Raw(`
		select
			coalesce(sum(case when status = 'pass' then 1 else 0 end), 0) as pass,
			coalesce(sum(case when status = 'fail' then 1 else 0 end), 0) as fail,
			coalesce(sum(case when status = 'skip' then 1 else 0 end), 0) as skip,
			coalesce(sum(case when status = 'blocked' then 1 else 0 end), 0) as blocked,
			coalesce(sum(case when status = 'not_run' then 1 else 0 end), 0) as not_run,
			count(*) as total
		from test_results
		where test_run_id = ?
	`, id).Scan(&summary).Error
	if err != nil {
		return nil, fmt.Errorf("testrun summary: %w", err)
	}
	return &summary, nil
}

func (r *TestRunRepo) seedResults(ctx context.Context, runID string, caseIDs []string) error {
	var caseRows []testCaseRow
	if err := r.db.WithContext(ctx).Where("id IN ?", caseIDs).Find(&caseRows).Error; err != nil {
		return fmt.Errorf("testrun seed fetch cases: %w", err)
	}

	caseMap := make(map[string]testCaseRow, len(caseRows))
	for _, cr := range caseRows {
		caseMap[cr.ID] = cr
	}

	now := time.Now()
	for _, cid := range caseIDs {
		tc, ok := caseMap[cid]
		if !ok {
			continue
		}
		result := testResultRow{
			ID:                     newUUID(),
			TestRunID:              runID,
			TestCaseID:             cid,
			Status:                 string(core.ResultNotRun),
			TestCaseCode:           tc.Code,
			TestCaseTitle:          tc.Title,
			TestCaseObjective:      tc.Objective,
			TestCasePreconditions:  tc.Preconditions,
			TestCaseSteps:          tc.Steps,
			TestCaseExpectedResult: tc.ExpectedResult,
			TestCasePriority:       tc.Priority,
			CreatedAt:              now,
			UpdatedAt:              now,
		}
		if err := r.db.WithContext(ctx).Create(&result).Error; err != nil {
			return fmt.Errorf("testrun seed result: %w", err)
		}
	}
	return nil
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type testRunRow struct {
	ID          string     `gorm:"column:id"`
	ProjectID   string     `gorm:"column:project_id"`
	PlanID      *string    `gorm:"column:test_plan_id"`
	Name        string     `gorm:"column:name"`
	Code        string     `gorm:"column:code"`
	Status      string     `gorm:"column:status"`
	StartedAt   time.Time  `gorm:"column:started_at"`
	CompletedAt *time.Time `gorm:"column:completed_at"`
	StartedBy   *string    `gorm:"column:started_by"`
	CreatedAt   time.Time  `gorm:"column:created_at"`
	UpdatedAt   time.Time  `gorm:"column:updated_at"`
}

func (testRunRow) TableName() string { return "test_runs" }

func (r testRunRow) toDomain() core.TestRun {
	return core.TestRun{
		ID:          r.ID,
		Code:        r.Code,
		Name:        r.Name,
		Status:      core.TestRunStatus(r.Status),
		PlanID:      r.PlanID,
		ProjectID:   r.ProjectID,
		StartedAt:   r.StartedAt,
		CompletedAt: r.CompletedAt,
	}
}

type testResultRow struct {
	ID                     string     `gorm:"column:id"`
	TestRunID              string     `gorm:"column:test_run_id"`
	TestCaseID             string     `gorm:"column:test_case_id"`
	TesterID               *string    `gorm:"column:tester_id"`
	Status                 string     `gorm:"column:status"`
	ExecutedAt             *time.Time `gorm:"column:executed_at"`
	Notes                  *string    `gorm:"column:notes"`
	TestCaseCode           string     `gorm:"column:test_case_code"`
	TestCaseTitle          string     `gorm:"column:test_case_title"`
	TestCaseObjective      string     `gorm:"column:test_case_objective"`
	TestCasePreconditions  string     `gorm:"column:test_case_preconditions"`
	TestCaseSteps          string     `gorm:"column:test_case_steps"`
	TestCaseExpectedResult string     `gorm:"column:test_case_expected_result"`
	TestCasePriority       string     `gorm:"column:test_case_priority"`
	TestCaseNotes          *string    `gorm:"column:test_case_notes"`
	CreatedAt              time.Time  `gorm:"column:created_at"`
	UpdatedAt              time.Time  `gorm:"column:updated_at"`
}

func (testResultRow) TableName() string { return "test_results" }

func (r testResultRow) toDomain() core.TestResult {
	return core.TestResult{
		ID:        r.ID,
		RunID:     r.TestRunID,
		CaseID:    r.TestCaseID,
		Status:    core.TestResultStatus(r.Status),
		TesterID:  r.TesterID,
		Notes:     r.Notes,
		UpdatedAt: r.UpdatedAt,
	}
}
