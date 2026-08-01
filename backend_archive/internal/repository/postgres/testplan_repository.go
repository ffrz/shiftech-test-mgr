package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/testplan"
	"github.com/shiftech/testmgr-backend/internal/repository/entitycode"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

const testPlanCodePrefix = "TP"

type TestPlanRepository struct {
	db *gorm.DB
}

func NewTestPlanRepository(db *gorm.DB) *TestPlanRepository {
	return &TestPlanRepository{db: db}
}

func (r *TestPlanRepository) FindAllByProject(ctx context.Context, projectID string) ([]testplan.TestPlan, error) {
	var rows []model.TestPlan
	if err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("code").Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testplan.TestPlan, len(rows))
	for i, row := range rows {
		result[i] = *toDomainTestPlan(row)
	}
	return result, nil
}

func (r *TestPlanRepository) FindByID(ctx context.Context, id string) (*testplan.TestPlan, error) {
	var m model.TestPlan
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test plan not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainTestPlan(m), nil
}

func (r *TestPlanRepository) Create(ctx context.Context, p *testplan.TestPlan) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if p.Code == "" {
			code, err := entitycode.Next(ctx, tx, p.ProjectID, testPlanCodePrefix)
			if err != nil {
				return apperror.Internal(err)
			}
			p.Code = code
		}
		m := fromDomainTestPlan(p)
		if err := tx.Create(&m).Error; err != nil {
			if isDuplicateKeyErr(err) {
				return apperror.Conflict("a test plan with this code already exists in this project")
			}
			return apperror.Internal(err)
		}
		*p = *toDomainTestPlan(m)
		return nil
	})
}

func (r *TestPlanRepository) Update(ctx context.Context, p *testplan.TestPlan) error {
	m := fromDomainTestPlan(p)
	err := r.db.WithContext(ctx).Model(&model.TestPlan{}).
		Where("id = ?", p.ID).
		Updates(map[string]any{
			"name":        m.Name,
			"description": m.Description,
			"status":      m.Status,
			"code":        m.Code,
		}).Error
	if err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("a test plan with this code already exists in this project")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestPlanRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.TestPlan{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestPlanRepository) FindCases(ctx context.Context, testPlanID string) ([]testplan.Case, error) {
	var rows []model.TestPlanCase
	if err := r.db.WithContext(ctx).Where("test_plan_id = ?", testPlanID).Order(`"order" ASC`).Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	result := make([]testplan.Case, len(rows))
	for i, row := range rows {
		result[i] = toDomainTestPlanCase(row)
	}
	return result, nil
}

func (r *TestPlanRepository) FindCaseByID(ctx context.Context, id string) (*testplan.Case, error) {
	var m model.TestPlanCase
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("test plan case not found")
		}
		return nil, apperror.Internal(err)
	}
	c := toDomainTestPlanCase(m)
	return &c, nil
}

func (r *TestPlanRepository) AddCase(ctx context.Context, c *testplan.Case) error {
	if c.ID == "" {
		c.ID = uuid.NewString()
	}
	m := model.TestPlanCase{ID: c.ID, TestPlanID: c.TestPlanID, TestCaseID: c.TestCaseID, Order: c.Order}
	if err := r.db.WithContext(ctx).Create(&m).Error; err != nil {
		if isDuplicateKeyErr(err) {
			return apperror.Conflict("this test case is already in the plan")
		}
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestPlanRepository) RemoveCase(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.TestPlanCase{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *TestPlanRepository) ReorderCases(ctx context.Context, orderedCaseIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for i, id := range orderedCaseIDs {
			if err := tx.Model(&model.TestPlanCase{}).Where("id = ?", id).Update(`"order"`, i).Error; err != nil {
				return apperror.Internal(err)
			}
		}
		return nil
	})
}

func toDomainTestPlan(m model.TestPlan) *testplan.TestPlan {
	return &testplan.TestPlan{
		ID:          m.ID,
		ProjectID:   m.ProjectID,
		Code:        m.Code,
		Name:        m.Name,
		Description: m.Description,
		Status:      testplan.Status(m.Status),
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func fromDomainTestPlan(p *testplan.TestPlan) model.TestPlan {
	return model.TestPlan{
		ID:          p.ID,
		ProjectID:   p.ProjectID,
		Code:        p.Code,
		Name:        p.Name,
		Description: p.Description,
		Status:      string(p.Status),
	}
}

func toDomainTestPlanCase(m model.TestPlanCase) testplan.Case {
	return testplan.Case{
		ID:         m.ID,
		TestPlanID: m.TestPlanID,
		TestCaseID: m.TestCaseID,
		Order:      m.Order,
	}
}
