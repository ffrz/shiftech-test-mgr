package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type TestPlanRepo struct {
	db *gorm.DB
}

func NewTestPlanRepo(db *gorm.DB) *TestPlanRepo {
	return &TestPlanRepo{db: db}
}

func (r *TestPlanRepo) List(ctx context.Context, filter core.TestPlanFilter) (*core.PageResult[core.TestPlan], error) {
	var rows []testPlanRow
	q := r.db.WithContext(ctx).Where("project_id = ?", filter.ProjectID)

	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.Search != nil {
		search := "%" + *filter.Search + "%"
		q = q.Where("(lower(name) like ? or lower(description) like ? or lower(code) like ?)", search, search, search)
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
		return nil, fmt.Errorf("testplan list: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]core.TestPlan, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}

	if err := r.enrichWithCaseIDs(ctx, items); err != nil {
		return nil, err
	}

	var nextCursor string
	if hasMore && len(rows) > 0 {
		last := rows[len(rows)-1]
		nextCursor = encodeCodeCursor(last.Code, last.ID)
	}

	var total int64
	r.db.WithContext(ctx).Model(&testPlanRow{}).Where("project_id = ?", filter.ProjectID).Count(&total)

	return &core.PageResult[core.TestPlan]{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      int(total),
	}, nil
}

func (r *TestPlanRepo) Get(ctx context.Context, id string) (*core.TestPlan, error) {
	var row testPlanRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testplan get: %w", err)
	}
	tp := row.toDomain()

	caseIDs, err := r.loadCaseIDs(ctx, id)
	if err != nil {
		return nil, err
	}
	tp.CaseIDs = caseIDs

	return &tp, nil
}

func (r *TestPlanRepo) Create(ctx context.Context, input core.CreateTestPlanInput) (*core.TestPlan, error) {
	status := string(core.PlanDraft)
	if input.Status != "" {
		status = string(input.Status)
	}
	now := time.Now()
	row := testPlanRow{
		ID:          newUUID(),
		ProjectID:   input.ProjectID,
		Name:        input.Name,
		Description: input.Description,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("testplan create: %w", err)
	}

	// re-fetch so code is populated by DB trigger
	if err := r.db.WithContext(ctx).Where("id = ?", row.ID).First(&row).Error; err != nil {
		return nil, fmt.Errorf("testplan create fetch: %w", err)
	}

	tp := row.toDomain()
	return &tp, nil
}

func (r *TestPlanRepo) AddCases(ctx context.Context, planID string, caseIDs []string) error {
	if len(caseIDs) == 0 {
		return nil
	}
	now := time.Now()
	rows := make([]testPlanCaseRow, 0, len(caseIDs))
	for _, cid := range caseIDs {
		rows = append(rows, testPlanCaseRow{
			ID:         newUUID(),
			TestPlanID: planID,
			TestCaseID: cid,
			Order:      0,
			CreatedAt:  now,
		})
	}

	result := r.db.WithContext(ctx).Clauses(
	// idempotent: skip if the pair already exists
	).Create(&rows)
	// Ignore unique constraint violations — the pair already exists is not an error
	if result.Error != nil && result.RowsAffected == 0 {
		// try individual inserts to isolate errors
		for _, row := range rows {
			if err := r.db.WithContext(ctx).Where(
				"test_plan_id = ? AND test_case_id = ?", planID, row.TestCaseID,
			).FirstOrCreate(&testPlanCaseRow{
				ID:         newUUID(),
				TestPlanID: planID,
				TestCaseID: row.TestCaseID,
				Order:      0,
				CreatedAt:  now,
			}).Error; err != nil {
				return fmt.Errorf("testplan add case: %w", err)
			}
		}
	}

	return nil
}

func (r *TestPlanRepo) RemoveCases(ctx context.Context, planID string, caseIDs []string) error {
	if len(caseIDs) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Where("test_plan_id = ? AND test_case_id IN ?", planID, caseIDs).Delete(&testPlanCaseRow{}).Error
}

func (r *TestPlanRepo) Approve(ctx context.Context, id string, approverID string) error {
	return r.db.WithContext(ctx).Model(&testPlanRow{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     string(core.PlanActive),
		"updated_at": time.Now(),
	}).Error
}

func (r *TestPlanRepo) loadCaseIDs(ctx context.Context, planID string) ([]string, error) {
	var rows []testPlanCaseRow
	if err := r.db.WithContext(ctx).Where("test_plan_id = ?", planID).Order("\"order\"").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("testplan case ids: %w", err)
	}
	ids := make([]string, len(rows))
	for i, row := range rows {
		ids[i] = row.TestCaseID
	}
	return ids, nil
}

func (r *TestPlanRepo) enrichWithCaseIDs(ctx context.Context, plans []core.TestPlan) error {
	if len(plans) == 0 {
		return nil
	}
	ids := make([]string, len(plans))
	for i, tp := range plans {
		ids[i] = tp.ID
	}

	var links []testPlanCaseRow
	if err := r.db.WithContext(ctx).Where("test_plan_id IN ?", ids).Order("\"order\"").Find(&links).Error; err != nil {
		return err
	}

	planCases := make(map[string][]string)
	for _, l := range links {
		planCases[l.TestPlanID] = append(planCases[l.TestPlanID], l.TestCaseID)
	}

	for i := range plans {
		plans[i].CaseIDs = planCases[plans[i].ID]
	}
	return nil
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type testPlanRow struct {
	ID          string    `gorm:"column:id"`
	ProjectID   string    `gorm:"column:project_id"`
	Code        string    `gorm:"column:code"`
	Name        string    `gorm:"column:name"`
	Description string    `gorm:"column:description"`
	Status      string    `gorm:"column:status"`
	CreatedAt   time.Time `gorm:"column:created_at"`
	UpdatedAt   time.Time `gorm:"column:updated_at"`
}

func (testPlanRow) TableName() string { return "test_plans" }

func (r testPlanRow) toDomain() core.TestPlan {
	return core.TestPlan{
		ID:          r.ID,
		Code:        r.Code,
		Name:        r.Name,
		Description: r.Description,
		Status:      core.TestPlanStatus(r.Status),
		ProjectID:   r.ProjectID,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
}

type testPlanCaseRow struct {
	ID         string    `gorm:"column:id"`
	TestPlanID string    `gorm:"column:test_plan_id"`
	TestCaseID string    `gorm:"column:test_case_id"`
	Order      int       `gorm:"column:order"`
	CreatedAt  time.Time `gorm:"column:created_at"`
}

func (testPlanCaseRow) TableName() string { return "test_plan_cases" }
