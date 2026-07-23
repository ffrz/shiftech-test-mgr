package mysql

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testrun"
	"github.com/shiftech/testmgr-backend/internal/repository/entitycode"
	"github.com/shiftech/testmgr-backend/internal/repository/mysql/model"
	testrunsvc "github.com/shiftech/testmgr-backend/internal/service/testrun"
)

const testRunCodePrefix = "TR"

type TestRunRepository struct {
	db *gorm.DB
}

func NewTestRunRepository(db *gorm.DB) *TestRunRepository {
	return &TestRunRepository{db: db}
}

func (r *TestRunRepository) FindAllByProject(ctx context.Context, projectID string) ([]testrun.TestRun, error) {
	var rows []model.TestRun
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("started_at DESC").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return toDomainTestRuns(rows), nil
}

func (r *TestRunRepository) FindAllByPlan(ctx context.Context, testPlanID string) ([]testrun.TestRun, error) {
	var rows []model.TestRun
	if err := r.db.WithContext(ctx).Where("test_plan_id = ?", testPlanID).Order("started_at DESC").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return toDomainTestRuns(rows), nil
}

func (r *TestRunRepository) FindByID(ctx context.Context, id string) (*testrun.TestRun, error) {
	var m model.TestRun
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test run not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainTestRun(m), nil
}

func (r *TestRunRepository) Create(ctx context.Context, run *testrun.TestRun) error {
	if run.ID == "" {
		run.ID = uuid.NewString()
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if run.Code == "" {
			code, err := entitycode.Next(ctx, tx, run.ProjectID, testRunCodePrefix)
			if err != nil {
				return apperror.Internal(err)
			}
			run.Code = code
		}
		m := fromDomainTestRun(run)
		if err := tx.Create(&m).Error; err != nil {
			if isDuplicateKeyErr(err) {
				return apperror.Conflict("a test run with this code already exists in this project")
			}
			return apperror.Internal(err)
		}
		*run = *toDomainTestRun(m)
		return nil
	})
}

func (r *TestRunRepository) Update(ctx context.Context, run *testrun.TestRun) error {
	m := fromDomainTestRun(run)
	err := r.db.WithContext(ctx).Model(&model.TestRun{}).
		Where("id = ?", run.ID).
		Updates(map[string]any{"name": m.Name, "code": m.Code}).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a test run with this code already exists in this project")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestRunRepository) UpdateStatus(ctx context.Context, id string, status testrun.Status, setCompletedAt bool, notes *string) (*testrun.TestRun, error) {
	payload := map[string]any{"status": string(status)}
	if setCompletedAt {
		payload["completed_at"] = gorm.Expr("CURRENT_TIMESTAMP")
	} else {
		payload["completed_at"] = nil
	}
	if notes != nil {
		payload["notes"] = *notes
	}
	if err := r.db.WithContext(ctx).Model(&model.TestRun{}).Where("id = ?", id).Updates(payload).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindByID(ctx, id)
}

func (r *TestRunRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.TestRun{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

// SeedResults is the ported equivalent of testResultRepository.seedForRun --
// see service/testrun/service.go's package doc for why this snapshot must
// never be skipped or simplified away.
func (r *TestRunRepository) SeedResults(ctx context.Context, testRunID string, snapshots []testrunsvc.TestCaseSnapshot, steps []testrunsvc.TestCaseStepSnapshot) error {
	if len(snapshots) == 0 {
		return apperror.Internal(errors.New("seedResults called with no snapshots"))
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		resultIDByCaseID := make(map[string]string, len(snapshots))
		rows := make([]model.TestResult, len(snapshots))
		for i, snap := range snapshots {
			id := uuid.NewString()
			resultIDByCaseID[snap.ID] = id
			rows[i] = model.TestResult{
				ID:                     id,
				TestRunID:              testRunID,
				TestCaseID:             snap.ID,
				Status:                 string(testrun.ResultNotRun),
				TestCaseCode:           snap.Code,
				TestCaseTitle:          snap.Title,
				TestCaseObjective:      snap.Objective,
				TestCasePreconditions:  snap.Preconditions,
				TestCaseSteps:          snap.Steps,
				TestCaseExpectedResult: snap.ExpectedResult,
				TestCasePriority:       snap.Priority,
				Order:                  i,
			}
		}
		if err := tx.Create(&rows).Error; err != nil {
			return apperror.Internal(err)
		}

		if len(steps) == 0 {
			return nil
		}
		stepRows := make([]model.TestResultStep, 0, len(steps))
		for _, step := range steps {
			resultID, ok := resultIDByCaseID[step.TestCaseID]
			if !ok {
				continue
			}
			stepRows = append(stepRows, model.TestResultStep{
				ID:             uuid.NewString(),
				TestResultID:   resultID,
				TestCaseStepID: step.ID,
				Status:         string(testrun.StepNotRun),
			})
		}
		if len(stepRows) == 0 {
			return nil
		}
		if err := tx.Create(&stepRows).Error; err != nil {
			return apperror.Internal(err)
		}
		return nil
	})
}

func (r *TestRunRepository) FindResultsByRun(ctx context.Context, testRunID string) ([]testrun.Result, error) {
	var rows []model.TestResult
	if err := r.db.WithContext(ctx).Where("test_run_id = ?", testRunID).Order("`order` ASC").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testrun.Result, len(rows))
	for i, row := range rows {
		result[i] = toDomainTestResult(row)
	}
	return result, nil
}

func (r *TestRunRepository) FindResultByID(ctx context.Context, id string) (*testrun.Result, error) {
	var m model.TestResult
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test result not found")
		}
		return nil, apperror.Internal(err)
	}
	res := toDomainTestResult(m)
	return &res, nil
}

func (r *TestRunRepository) UpdateResult(ctx context.Context, id string, status testrun.ResultStatus, testerID *string, notes string) (*testrun.Result, error) {
	payload := map[string]any{
		"status":      string(status),
		"tester_id":   testerID,
		"notes":       notes,
		"executed_at": gorm.Expr("CURRENT_TIMESTAMP"),
	}
	if err := r.db.WithContext(ctx).Model(&model.TestResult{}).Where("id = ?", id).Updates(payload).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindResultByID(ctx, id)
}

func (r *TestRunRepository) UpdateResultSnapshot(ctx context.Context, id string, snapshot testrunsvc.TestCaseSnapshot) (*testrun.Result, error) {
	payload := map[string]any{
		"test_case_code":            snapshot.Code,
		"test_case_title":           snapshot.Title,
		"test_case_objective":       snapshot.Objective,
		"test_case_preconditions":   snapshot.Preconditions,
		"test_case_steps":           snapshot.Steps,
		"test_case_expected_result": snapshot.ExpectedResult,
		"test_case_priority":        snapshot.Priority,
	}
	if err := r.db.WithContext(ctx).Model(&model.TestResult{}).Where("id = ?", id).Updates(payload).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindResultByID(ctx, id)
}

func (r *TestRunRepository) FindResultStepByID(ctx context.Context, id string) (*testrun.ResultStep, error) {
	var m model.TestResultStep
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test result step not found")
		}
		return nil, apperror.Internal(err)
	}
	step := toDomainTestResultStep(m)
	return &step, nil
}

func (r *TestRunRepository) UpdateResultStep(ctx context.Context, id string, status testrun.StepStatus, actualResult string) (*testrun.ResultStep, error) {
	payload := map[string]any{"status": string(status), "actual_result": actualResult}
	if err := r.db.WithContext(ctx).Model(&model.TestResultStep{}).Where("id = ?", id).Updates(payload).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindResultStepByID(ctx, id)
}

func toDomainTestRuns(rows []model.TestRun) []testrun.TestRun {
	result := make([]testrun.TestRun, len(rows))
	for i, row := range rows {
		result[i] = *toDomainTestRun(row)
	}
	return result
}

func toDomainTestRun(m model.TestRun) *testrun.TestRun {
	return &testrun.TestRun{
		ID:          m.ID,
		ProjectID:   m.ProjectID,
		TestPlanID:  m.TestPlanID,
		Code:        m.Code,
		Name:        m.Name,
		Status:      testrun.Status(m.Status),
		StartedAt:   m.StartedAt,
		CompletedAt: m.CompletedAt,
		Notes:       m.Notes,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func fromDomainTestRun(r *testrun.TestRun) model.TestRun {
	return model.TestRun{
		ID:          r.ID,
		ProjectID:   r.ProjectID,
		TestPlanID:  r.TestPlanID,
		Code:        r.Code,
		Name:        r.Name,
		Status:      string(r.Status),
		StartedAt:   r.StartedAt,
		CompletedAt: r.CompletedAt,
		Notes:       r.Notes,
	}
}

func toDomainTestResult(m model.TestResult) testrun.Result {
	return testrun.Result{
		ID:                     m.ID,
		TestRunID:              m.TestRunID,
		TestCaseID:             m.TestCaseID,
		TesterID:               m.TesterID,
		Status:                 testrun.ResultStatus(m.Status),
		ExecutedAt:             m.ExecutedAt,
		Notes:                  m.Notes,
		TestCaseCode:           m.TestCaseCode,
		TestCaseTitle:          m.TestCaseTitle,
		TestCaseObjective:      m.TestCaseObjective,
		TestCasePreconditions:  m.TestCasePreconditions,
		TestCaseSteps:          m.TestCaseSteps,
		TestCaseExpectedResult: m.TestCaseExpectedResult,
		TestCasePriority:       m.TestCasePriority,
		Order:                  m.Order,
		CreatedAt:              m.CreatedAt,
		UpdatedAt:              m.UpdatedAt,
	}
}

func toDomainTestResultStep(m model.TestResultStep) testrun.ResultStep {
	return testrun.ResultStep{
		ID:             m.ID,
		TestResultID:   m.TestResultID,
		TestCaseStepID: m.TestCaseStepID,
		Status:         testrun.StepStatus(m.Status),
		ActualResult:   m.ActualResult,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}
