package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TestResultRepo struct {
	db *gorm.DB
}

func NewTestResultRepo(db *gorm.DB) *TestResultRepo {
	return &TestResultRepo{db: db}
}

func (r *TestResultRepo) List(ctx context.Context, filter core.TestResultFilter) (*core.PageResult[core.TestResult], error) {
	var rows []testResultRow
	q := r.db.WithContext(ctx).
		Joins("JOIN test_runs tr ON tr.id = test_results.test_run_id").
		Where("tr.project_id = ?", filter.ProjectID)

	if filter.RunID != nil {
		q = q.Where("test_results.test_run_id = ?", *filter.RunID)
	}
	if filter.Status != nil {
		q = q.Where("test_results.status = ?", *filter.Status)
	}
	if filter.TesterID != nil {
		q = q.Where("test_results.tester_id = ?", *filter.TesterID)
	}

	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	if filter.Cursor != nil {
		if decoded, err := decodeCreatedAtCursor(*filter.Cursor); err == nil {
			q = q.Where("(test_results.created_at, test_results.id) > (?, ?)", decoded.CreatedAt, decoded.ID)
		}
	}

	q = q.Order("test_results.created_at, test_results.id").Limit(limit + 1)

	if err := q.Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testresult list: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]core.TestResult, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}

	var nextCursor string
	if hasMore && len(rows) > 0 {
		last := rows[len(rows)-1]
		nextCursor = encodeCreatedAtCursor(last.CreatedAt, last.ID)
	}

	var total int64
	r.db.WithContext(ctx).
		Joins("JOIN test_runs tr ON tr.id = test_results.test_run_id").
		Model(&testResultRow{}).
		Where("tr.project_id = ?", filter.ProjectID).Count(&total)

	return &core.PageResult[core.TestResult]{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      int(total),
	}, nil
}

func (r *TestResultRepo) Get(ctx context.Context, id string) (*core.TestResult, error) {
	var row testResultRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testresult get: %w", err)
	}
	res := row.toDomain()
	return &res, nil
}

func (r *TestResultRepo) ListStepsForRun(ctx context.Context, projectID, runID string) ([]core.TestResultStep, error) {
	var rows []testResultStepDetailRow
	err := r.db.WithContext(ctx).
		Table("test_result_steps trs").
		Select(`trs.id, trs.test_result_id, trs.test_case_step_id, trs.status,
			trs.actual_result, trs.created_at, trs.updated_at,
			tcs.test_case_id AS step_test_case_id, tcs.step_number,
			tcs.action, tcs.expected_result AS step_expected_result,
			tcs.created_at AS step_created_at, tcs.updated_at AS step_updated_at`).
		Joins("JOIN test_results trr ON trr.id = trs.test_result_id").
		Joins("JOIN test_runs tr ON tr.id = trr.test_run_id").
		Joins("JOIN test_case_steps tcs ON tcs.id = trs.test_case_step_id").
		Where("tr.project_id = ? AND tr.id = ?", projectID, runID).
		Order("trr.\"order\", tcs.step_number, trs.id").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("testresult list steps: %w", err)
	}
	items := make([]core.TestResultStep, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}
	return items, nil
}

func (r *TestResultRepo) RecordStep(ctx context.Context, projectID, stepResultID string, input core.RecordStepResultInput) (*core.TestResultStep, error) {
	result := r.db.WithContext(ctx).Exec(`
		UPDATE test_result_steps AS trs
		SET status = ?, actual_result = ?, updated_at = ?
		FROM test_results trr
		JOIN test_runs tr ON tr.id = trr.test_run_id
		WHERE trs.test_result_id = trr.id
		  AND trs.id = ?
		  AND tr.project_id = ?`, string(input.Status), input.ActualResult, time.Now(), stepResultID, projectID)
	if result.Error != nil {
		return nil, fmt.Errorf("testresult record step: %w", result.Error)
	}
	if result.RowsAffected != 1 {
		return nil, fmt.Errorf("testresult step not found in the scoped project")
	}
	return r.getStep(ctx, projectID, stepResultID)
}

func (r *TestResultRepo) getStep(ctx context.Context, projectID, stepResultID string) (*core.TestResultStep, error) {
	var row testResultStepDetailRow
	err := r.db.WithContext(ctx).
		Table("test_result_steps trs").
		Select(`trs.id, trs.test_result_id, trs.test_case_step_id, trs.status,
			trs.actual_result, trs.created_at, trs.updated_at,
			tcs.test_case_id AS step_test_case_id, tcs.step_number,
			tcs.action, tcs.expected_result AS step_expected_result,
			tcs.created_at AS step_created_at, tcs.updated_at AS step_updated_at`).
		Joins("JOIN test_results trr ON trr.id = trs.test_result_id").
		Joins("JOIN test_runs tr ON tr.id = trr.test_run_id").
		Joins("JOIN test_case_steps tcs ON tcs.id = trs.test_case_step_id").
		Where("tr.project_id = ? AND trs.id = ?", projectID, stepResultID).
		Take(&row).Error
	if err != nil {
		return nil, fmt.Errorf("testresult get step: %w", err)
	}
	item := row.toDomain()
	return &item, nil
}

type testResultStepDetailRow struct {
	ID                 string    `gorm:"column:id"`
	TestResultID       string    `gorm:"column:test_result_id"`
	TestCaseStepID     string    `gorm:"column:test_case_step_id"`
	Status             string    `gorm:"column:status"`
	ActualResult       *string   `gorm:"column:actual_result"`
	CreatedAt          time.Time `gorm:"column:created_at"`
	UpdatedAt          time.Time `gorm:"column:updated_at"`
	StepTestCaseID     string    `gorm:"column:step_test_case_id"`
	StepNumber         int       `gorm:"column:step_number"`
	Action             string    `gorm:"column:action"`
	StepExpectedResult *string   `gorm:"column:step_expected_result"`
	StepCreatedAt      time.Time `gorm:"column:step_created_at"`
	StepUpdatedAt      time.Time `gorm:"column:step_updated_at"`
}

func (r testResultStepDetailRow) toDomain() core.TestResultStep {
	return core.TestResultStep{
		ID:             r.ID,
		TestResultID:   r.TestResultID,
		TestCaseStepID: r.TestCaseStepID,
		Status:         core.TestResultStepStatus(r.Status),
		ActualResult:   r.ActualResult,
		Step: core.TestCaseStep{
			ID:             r.TestCaseStepID,
			TestCaseID:     r.StepTestCaseID,
			StepNumber:     r.StepNumber,
			Action:         r.Action,
			ExpectedResult: r.StepExpectedResult,
			CreatedAt:      r.StepCreatedAt,
			UpdatedAt:      r.StepUpdatedAt,
		},
		CreatedAt: r.CreatedAt,
		UpdatedAt: r.UpdatedAt,
	}
}
