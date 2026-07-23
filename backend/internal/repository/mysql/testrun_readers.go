package mysql

import (
	"context"

	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/repository/mysql/model"
	testrunsvc "github.com/shiftech/testmgr-backend/internal/service/testrun"
)

// TestCaseSnapshotRepository is a narrow read-only adapter over test_cases /
// test_case_steps for testrun.Service -- it never writes and never depends
// on the testcase module's own repository/service (out of scope here, see
// task constraints).
type TestCaseSnapshotRepository struct {
	db *gorm.DB
}

func NewTestCaseSnapshotRepository(db *gorm.DB) *TestCaseSnapshotRepository {
	return &TestCaseSnapshotRepository{db: db}
}

func (r *TestCaseSnapshotRepository) FindByIDs(ctx context.Context, ids []string) ([]testrunsvc.TestCaseSnapshot, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	var rows []model.TestCaseSnapshotRow
	if err := r.db.WithContext(ctx).Where("id IN ?", ids).Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testrunsvc.TestCaseSnapshot, len(rows))
	for i, row := range rows {
		result[i] = testrunsvc.TestCaseSnapshot{
			ID:             row.ID,
			Code:           row.Code,
			Title:          row.Title,
			Objective:      row.Objective,
			Preconditions:  row.Preconditions,
			Steps:          row.Steps,
			ExpectedResult: row.ExpectedResult,
			Priority:       row.Priority,
			StepType:       row.StepType,
		}
	}
	return result, nil
}

func (r *TestCaseSnapshotRepository) FindStepsByTestCaseIDs(ctx context.Context, testCaseIDs []string) ([]testrunsvc.TestCaseStepSnapshot, error) {
	if len(testCaseIDs) == 0 {
		return nil, nil
	}
	var rows []model.TestCaseStepSnapshotRow
	if err := r.db.WithContext(ctx).Where("test_case_id IN ?", testCaseIDs).Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testrunsvc.TestCaseStepSnapshot, len(rows))
	for i, row := range rows {
		result[i] = testrunsvc.TestCaseStepSnapshot{ID: row.ID, TestCaseID: row.TestCaseID}
	}
	return result, nil
}

// TestPlanCaseReader is a narrow read-only adapter over test_plan_cases for
// testrun.Service.Start -- resolves a plan's current scope in order.
type TestPlanCaseReader struct {
	db *gorm.DB
}

func NewTestPlanCaseReader(db *gorm.DB) *TestPlanCaseReader {
	return &TestPlanCaseReader{db: db}
}

func (r *TestPlanCaseReader) FindOrderedTestCaseIDsByPlan(ctx context.Context, testPlanID string) ([]string, error) {
	var rows []model.TestPlanCase
	if err := r.db.WithContext(ctx).Where("test_plan_id = ?", testPlanID).Order("`order` ASC").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.TestCaseID
	}
	return ids, nil
}
