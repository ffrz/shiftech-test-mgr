package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testcase"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
	testcasesvc "github.com/shiftech/testmgr-backend/internal/service/testcase"
)

type TestCaseRepository struct {
	db *gorm.DB
}

func NewTestCaseRepository(db *gorm.DB) *TestCaseRepository {
	return &TestCaseRepository{db: db}
}

func (r *TestCaseRepository) FindAllByProject(ctx context.Context, projectID string, query testcase.Query) ([]testcase.TestCase, error) {
	tx := r.db.WithContext(ctx).Model(&model.TestCase{}).Where("project_id = ?", projectID)

	if query.Search != "" {
		tx = tx.Where("title ILIKE ?", "%"+query.Search+"%")
	}
	if query.Status != "" {
		tx = tx.Where("status = ?", string(query.Status))
	}
	if query.Priority != "" {
		tx = tx.Where("priority = ?", string(query.Priority))
	}
	if query.ModuleID != "" {
		tx = tx.Where("module_id = ?", query.ModuleID)
	}
	if len(query.TagIDs) > 0 {
		tx = tx.Where("id IN (?)", r.db.Model(&model.TestCaseTag{}).
			Select("test_case_id").
			Where("tag_id IN ?", query.TagIDs))
	}

	tx = tx.Order("code")

	var rows []model.TestCase
	if err := tx.Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}

	result := make([]testcase.TestCase, len(rows))
	for i, row := range rows {
		result[i] = *toDomainTestCase(row)
	}
	return result, nil
}

func (r *TestCaseRepository) FindByID(ctx context.Context, id string) (*testcase.WithDetails, error) {
	var m model.TestCase
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test case not found")
		}
		return nil, apperror.Internal(err)
	}

	var stepRows []model.TestCaseStep
	if err := r.db.WithContext(ctx).
		Where("test_case_id = ?", id).
		Order("step_number ASC").
		Find(&stepRows).Error; err != nil {
		return nil, apperror.Internal(err)
	}

	var tagRows []model.TestCaseTag
	if err := r.db.WithContext(ctx).Where("test_case_id = ?", id).Find(&tagRows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	tagIDs := make([]string, len(tagRows))
	for i, t := range tagRows {
		tagIDs[i] = t.TagID
	}

	steps := make([]testcase.TestCaseStep, len(stepRows))
	for i, s := range stepRows {
		steps[i] = toDomainTestCaseStep(s)
	}

	return &testcase.WithDetails{
		TestCase: *toDomainTestCase(m),
		Steps:    steps,
		TagIDs:   tagIDs,
	}, nil
}

func (r *TestCaseRepository) Create(ctx context.Context, tc *testcase.TestCase) error {
	if tc.ID == "" {
		tc.ID = uuid.NewString()
	}
	m := fromDomainTestCase(tc)
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a test case with this code already exists in this project")
		}
		return apperror.Internal(err)
	}
	*tc = *toDomainTestCase(m)
	return nil
}

func (r *TestCaseRepository) Update(ctx context.Context, tc *testcase.TestCase) error {
	m := fromDomainTestCase(tc)
	err := r.db.WithContext(ctx).Model(&model.TestCase{}).
		Where("id = ?", tc.ID).
		Updates(map[string]any{
			"module_id":       m.ModuleID,
			"code":            m.Code,
			"title":           m.Title,
			"objective":       m.Objective,
			"preconditions":   m.Preconditions,
			"steps":           m.Steps,
			"expected_result": m.ExpectedResult,
			"priority":        m.Priority,
			"status":          m.Status,
			"notes":           m.Notes,
			"step_type":       m.StepType,
			"target_role_id":  m.TargetRoleID,
		}).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a test case with this code already exists in this project")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestCaseRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.TestCase{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

// ReplaceSteps mirrors testCaseStepRepository.ts's replaceForTestCase:
// delete all existing steps then insert the given list renumbered 1..N,
// wrapped in a transaction so a mid-batch failure can't leave a test case
// with zero steps.
func (r *TestCaseRepository) ReplaceSteps(ctx context.Context, testCaseID string, steps []testcasesvc.StepInput) ([]testcase.TestCaseStep, error) {
	var result []testcase.TestCaseStep
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("test_case_id = ?", testCaseID).Delete(&model.TestCaseStep{}).Error; err != nil {
			return err
		}
		if len(steps) == 0 {
			return nil
		}

		rows := make([]model.TestCaseStep, len(steps))
		for i, s := range steps {
			var expected *string
			if s.ExpectedResult != "" {
				expected = &s.ExpectedResult
			}
			rows[i] = model.TestCaseStep{
				ID:             uuid.NewString(),
				TestCaseID:     testCaseID,
				StepNumber:     i + 1,
				Action:         s.Action,
				ExpectedResult: expected,
			}
		}
		if err := tx.Create(&rows).Error; err != nil {
			return err
		}
		result = make([]testcase.TestCaseStep, len(rows))
		for i, row := range rows {
			result[i] = toDomainTestCaseStep(row)
		}
		return nil
	})
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return result, nil
}

// SaveTags mirrors tagRepository.ts's setTagsForTestCase: full delete-all
// then insert-all of the junction rows, in a transaction.
func (r *TestCaseRepository) SaveTags(ctx context.Context, testCaseID string, tagIDs []string) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("test_case_id = ?", testCaseID).Delete(&model.TestCaseTag{}).Error; err != nil {
			return err
		}
		if len(tagIDs) == 0 {
			return nil
		}
		rows := make([]model.TestCaseTag, len(tagIDs))
		for i, tagID := range tagIDs {
			rows[i] = model.TestCaseTag{TestCaseID: testCaseID, TagID: tagID}
		}
		return tx.Create(&rows).Error
	})
	if err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func toDomainTestCase(m model.TestCase) *testcase.TestCase {
	return &testcase.TestCase{
		ID:             m.ID,
		ProjectID:      m.ProjectID,
		ModuleID:       m.ModuleID,
		Code:           m.Code,
		Title:          m.Title,
		Objective:      m.Objective,
		Preconditions:  m.Preconditions,
		Steps:          m.Steps,
		ExpectedResult: m.ExpectedResult,
		Priority:       testcase.Priority(m.Priority),
		Status:         testcase.Status(m.Status),
		Notes:          m.Notes,
		StepType:       testcase.StepType(m.StepType),
		TargetRoleID:   m.TargetRoleID,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}
}

func fromDomainTestCase(tc *testcase.TestCase) model.TestCase {
	return model.TestCase{
		ID:             tc.ID,
		ProjectID:      tc.ProjectID,
		ModuleID:       tc.ModuleID,
		Code:           tc.Code,
		Title:          tc.Title,
		Objective:      tc.Objective,
		Preconditions:  tc.Preconditions,
		Steps:          tc.Steps,
		ExpectedResult: tc.ExpectedResult,
		Priority:       string(tc.Priority),
		Status:         string(tc.Status),
		Notes:          tc.Notes,
		StepType:       string(tc.StepType),
		TargetRoleID:   tc.TargetRoleID,
	}
}

func toDomainTestCaseStep(m model.TestCaseStep) testcase.TestCaseStep {
	expected := ""
	if m.ExpectedResult != nil {
		expected = *m.ExpectedResult
	}
	return testcase.TestCaseStep{
		ID:             m.ID,
		TestCaseID:     m.TestCaseID,
		StepNumber:     m.StepNumber,
		Action:         m.Action,
		ExpectedResult: expected,
	}
}
