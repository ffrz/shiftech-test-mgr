package postgres

import (
	"context"
	"fmt"

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
