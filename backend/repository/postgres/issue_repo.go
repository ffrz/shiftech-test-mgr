package postgres

import (
	"context"
	"errors"
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
		ID:             issueID,
		ProjectID:      input.ProjectID,
		Title:          input.Title,
		Description:    strOrEmpty(input.Description),
		Type:           string(input.Type),
		Priority:       string(input.Priority),
		Status:         string(core.IssueOpen),
		ModuleID:       input.ModuleID,
		ActualResult:   input.ActualResult,
		ExpectedResult: input.ExpectedResult,
		TargetRoleID:   input.TargetRoleID,
		AssignedTo:     input.AssignedTo,
		ExternalLinks:  externalLinks(input.ExternalLinks),
		CreatedAt:      now,
		UpdatedAt:      now,
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

// GetByCode resolves an issue by its human code (e.g. "ISS-0072") within a
// project. The caller is expected to pass the code already normalized to the
// canonical "ISS-0001" form (see service.IssueService.GetByCode).
func (r *IssueRepo) GetByCode(ctx context.Context, projectID, code string) (*core.Issue, error) {
	var row issueRow
	err := r.db.WithContext(ctx).Where("project_id = ? AND lower(code) = lower(?)", projectID, code).First(&row).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("issue not found by code %s", code)
	}
	if err != nil {
		return nil, fmt.Errorf("issue get by code: %w", err)
	}
	iss := row.toDomain()
	return &iss, nil
}

func (r *IssueRepo) ListLinks(ctx context.Context, issueID string) ([]core.IssueLink, error) {
	var rows []issueLinkRow
	if err := r.db.WithContext(ctx).Raw(`
		select
			res.id as test_result_id,
			res.status,
			res.executed_at,
			res.notes,
			res.tester_id,
			run.id as test_run_id,
			run.code as test_run_code,
			run.name as test_run_name,
			run.status as test_run_status,
			tc.id as test_case_id,
			coalesce(res.test_case_code, tc.code) as test_case_code,
			coalesce(res.test_case_title, tc.title) as test_case_title
		from issue_test_results itr
		join test_results res on res.id = itr.test_result_id
		join test_runs run on run.id = res.test_run_id
		left join test_cases tc on tc.id = res.test_case_id
		where itr.issue_id = ?
		order by res.executed_at desc nulls last, res.created_at desc, res.id
	`, issueID).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("issue list links: %w", err)
	}

	out := make([]core.IssueLink, len(rows))
	for i, row := range rows {
		out[i] = row.toDomain()
	}
	return out, nil
}

func (r *IssueRepo) ListTagNames(ctx context.Context, issueID string) ([]string, error) {
	var names []string
	if err := r.db.WithContext(ctx).Raw(`
		select t.name
		from issue_tags it
		join tags t on t.id = it.tag_id
		where it.issue_id = ?
		order by t.name
	`, issueID).Scan(&names).Error; err != nil {
		return nil, fmt.Errorf("issue list tags: %w", err)
	}
	if names == nil {
		names = []string{}
	}
	return names, nil
}

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

type issueRow struct {
	ID             string        `gorm:"column:id"`
	ProjectID      string        `gorm:"column:project_id"`
	Code           string        `gorm:"column:code"`
	Title          string        `gorm:"column:title"`
	Description    string        `gorm:"column:description"`
	ActualResult   *string       `gorm:"column:actual_result"`
	ExpectedResult *string       `gorm:"column:expected_result"`
	Type           string        `gorm:"column:type"`
	Status         string        `gorm:"column:status"`
	Priority       string        `gorm:"column:priority"`
	ModuleID       *string       `gorm:"column:module_id"`
	AssignedTo     *string       `gorm:"column:assigned_to"`
	TargetRoleID   *string       `gorm:"column:target_role_id"`
	ExternalLinks  externalLinks `gorm:"column:external_links"`
	CreatedBy      *string       `gorm:"column:created_by"`
	CreatedAt      time.Time     `gorm:"column:created_at"`
	UpdatedAt      time.Time     `gorm:"column:updated_at"`
}

func (issueRow) TableName() string { return "issues" }

func (r issueRow) toDomain() core.Issue {
	return core.Issue{
		ID:             r.ID,
		Code:           r.Code,
		ProjectID:      r.ProjectID,
		ModuleID:       r.ModuleID,
		Type:           core.IssueType(r.Type),
		Title:          r.Title,
		Description:    emptyToNil(r.Description),
		ActualResult:   r.ActualResult,
		ExpectedResult: r.ExpectedResult,
		Priority:       core.IssuePriority(r.Priority),
		Status:         core.IssueStatus(r.Status),
		AssignedTo:     r.AssignedTo,
		TargetRoleID:   r.TargetRoleID,
		ExternalLinks:  []core.ExternalLink(r.ExternalLinks),
		CreatedBy:      r.CreatedBy,
		CreatedAt:      r.CreatedAt,
		UpdatedAt:      r.UpdatedAt,
	}
}

type issueTestResultRow struct {
	ID           string    `gorm:"column:id"`
	IssueID      string    `gorm:"column:issue_id"`
	TestResultID string    `gorm:"column:test_result_id"`
	CreatedAt    time.Time `gorm:"column:created_at"`
}

func (issueTestResultRow) TableName() string { return "issue_test_results" }

type issueLinkRow struct {
	TestResultID  string     `gorm:"column:test_result_id"`
	Status        string     `gorm:"column:status"`
	ExecutedAt    *time.Time `gorm:"column:executed_at"`
	Notes         *string    `gorm:"column:notes"`
	TesterID      *string    `gorm:"column:tester_id"`
	TestRunID     string     `gorm:"column:test_run_id"`
	TestRunCode   string     `gorm:"column:test_run_code"`
	TestRunName   string     `gorm:"column:test_run_name"`
	TestRunStatus string     `gorm:"column:test_run_status"`
	TestCaseID    string     `gorm:"column:test_case_id"`
	TestCaseCode  string     `gorm:"column:test_case_code"`
	TestCaseTitle string     `gorm:"column:test_case_title"`
}

func (r issueLinkRow) toDomain() core.IssueLink {
	return core.IssueLink{
		TestResultID:  r.TestResultID,
		Status:        core.TestResultStatus(r.Status),
		ExecutedAt:    r.ExecutedAt,
		Notes:         r.Notes,
		TesterID:      r.TesterID,
		TestRunID:     r.TestRunID,
		TestRunCode:   r.TestRunCode,
		TestRunName:   r.TestRunName,
		TestRunStatus: core.TestRunStatus(r.TestRunStatus),
		TestCaseID:    r.TestCaseID,
		TestCaseCode:  r.TestCaseCode,
		TestCaseTitle: r.TestCaseTitle,
	}
}
