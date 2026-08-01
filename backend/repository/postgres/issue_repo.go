package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/shiftech/testify-platform/core"
	"gorm.io/gorm"
)

type IssueRepo struct {
	db *gorm.DB
}

func NewIssueRepo(db *gorm.DB) *IssueRepo {
	return &IssueRepo{db: db}
}

func (r *IssueRepo) List(ctx context.Context, filter core.IssueFilter) (*core.PageResult[core.Issue], error) {
	var rows []issueRow
	q := r.db.WithContext(ctx).Where("project_id = ?", filter.ProjectID)

	if filter.Type != nil {
		q = q.Where("type = ?", *filter.Type)
	}
	if filter.Status != nil {
		q = q.Where("status = ?", *filter.Status)
	}
	if filter.Priority != nil {
		q = q.Where("priority = ?", *filter.Priority)
	}
	if filter.AssigneeID != nil {
		q = q.Where("assigned_to = ?", *filter.AssigneeID)
	}
	if filter.RunID != nil {
		q = q.Where("exists (select 1 from issue_test_results itr where itr.issue_id = issues.id and itr.test_result_id in (select id from test_results where test_run_id = ?))", *filter.RunID)
	}
	if filter.CaseID != nil {
		q = q.Where("exists (select 1 from issue_test_results itr where itr.issue_id = issues.id and itr.test_result_id in (select id from test_results where test_case_id = ?))", *filter.CaseID)
	}
	if filter.Search != nil {
		search := "%" + strings.ToLower(*filter.Search) + "%"
		q = q.Where("(lower(title) like ? or lower(description) like ? or lower(code) like ?)", search, search, search)
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
		return nil, fmt.Errorf("issue list: %w", err)
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	items := make([]core.Issue, len(rows))
	for i, row := range rows {
		items[i] = row.toDomain()
	}

	var nextCursor string
	if hasMore && len(rows) > 0 {
		last := rows[len(rows)-1]
		nextCursor = encodeCodeCursor(last.Code, last.ID)
	}

	var total int64
	r.db.WithContext(ctx).Model(&issueRow{}).Where("project_id = ?", filter.ProjectID).Count(&total)

	return &core.PageResult[core.Issue]{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      int(total),
	}, nil
}

func (r *IssueRepo) Get(ctx context.Context, id string) (*core.Issue, error) {
	var row issueRow
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&row).Error; err != nil {
		return nil, fmt.Errorf("issue get: %w", err)
	}
	iss := row.toDomain()
	return &iss, nil
}

func (r *IssueRepo) Create(ctx context.Context, input core.CreateIssueInput) (*core.Issue, error) {
	issueID := newUUID()
	now := time.Now()
	row := issueRow{
		ID:          issueID,
		ProjectID:   input.ProjectID,
		Title:       input.Title,
		Description: input.Description,
		Type:        string(input.Type),
		Priority:    string(input.Priority),
		Status:      string(core.IssueOpen),
		ModuleID:    input.ModuleID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := r.db.WithContext(ctx).Create(&row).Error; err != nil {
		return nil, fmt.Errorf("issue create: %w", err)
	}

	if input.TestResultID != "" {
		link := issueTestResultRow{
			ID:           newUUID(),
			IssueID:      issueID,
			TestResultID: input.TestResultID,
			CreatedAt:    now,
		}
		if err := r.db.WithContext(ctx).Create(&link).Error; err != nil {
			return nil, fmt.Errorf("issue link test result: %w", err)
		}
	}

	if err := r.db.WithContext(ctx).Where("id = ?", issueID).First(&row).Error; err != nil {
		return nil, fmt.Errorf("issue create fetch: %w", err)
	}

	iss := row.toDomain()
	return &iss, nil
}

func (r *IssueRepo) UpdateStatus(ctx context.Context, id string, status core.IssueStatus) error {
	return r.db.WithContext(ctx).Model(&issueRow{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     string(status),
		"updated_at": time.Now(),
	}).Error
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type issueRow struct {
	ID             string    `gorm:"column:id"`
	ProjectID      string    `gorm:"column:project_id"`
	Code           string    `gorm:"column:code"`
	Title          string    `gorm:"column:title"`
	Description    string    `gorm:"column:description"`
	ActualResult   *string   `gorm:"column:actual_result"`
	ExpectedResult *string   `gorm:"column:expected_result"`
	Type           string    `gorm:"column:type"`
	Status         string    `gorm:"column:status"`
	Priority       string    `gorm:"column:priority"`
	ModuleID       *string   `gorm:"column:module_id"`
	AssignedTo     *string   `gorm:"column:assigned_to"`
	CreatedBy      *string   `gorm:"column:created_by"`
	CreatedAt      time.Time `gorm:"column:created_at"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}

func (issueRow) TableName() string { return "issues" }

func (r issueRow) toDomain() core.Issue {
	iss := core.Issue{
		ID:          r.ID,
		Code:        r.Code,
		Title:       r.Title,
		Description: r.Description,
		Type:        core.IssueType(r.Type),
		Status:      core.IssueStatus(r.Status),
		Priority:    core.TestCasePriority(r.Priority),
		ModuleID:    r.ModuleID,
		ProjectID:   r.ProjectID,
		AssigneeID:  r.AssignedTo,
		CreatedAt:   r.CreatedAt,
		UpdatedAt:   r.UpdatedAt,
	}
	return iss
}

type issueTestResultRow struct {
	ID           string    `gorm:"column:id"`
	IssueID      string    `gorm:"column:issue_id"`
	TestResultID string    `gorm:"column:test_result_id"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (issueTestResultRow) TableName() string { return "issue_test_results" }
