package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/issue"
	"github.com/shiftech/testmgr-backend/internal/repository/entitycode"
	"github.com/shiftech/testmgr-backend/internal/repository/postgres/model"
)

const issueCodePrefix = "ISS"

type IssueRepository struct {
	db *gorm.DB
}

func NewIssueRepository(db *gorm.DB) *IssueRepository {
	return &IssueRepository{db: db}
}

func (r *IssueRepository) FindAllByProject(ctx context.Context, projectID string, search string, limit int) ([]issue.Issue, error) {
	tx := r.db.WithContext(ctx).Where("project_id = ?", projectID)
	if search != "" {
		like := "%" + search + "%"
		tx = tx.Where("title ILIKE ? OR code ILIKE ?", like, like)
	}
	tx = tx.Order("created_at DESC")
	if limit > 0 {
		tx = tx.Limit(limit)
	}
	var rows []model.Issue
	if err := tx.Find(&rows).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return toDomainIssues(rows)
}

func (r *IssueRepository) FindAllByTestRun(ctx context.Context, testRunID string) ([]issue.Issue, error) {
	var rows []model.Issue
	err := r.db.WithContext(ctx).
		Joins("JOIN issue_test_results itr ON itr.issue_id = issues.id").
		Joins("JOIN test_results tr ON tr.id = itr.test_result_id").
		Where("tr.test_run_id = ?", testRunID).
		Group("issues.id").
		Order("issues.created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return toDomainIssues(rows)
}

func (r *IssueRepository) FindAllByTestResult(ctx context.Context, testResultID string) ([]issue.Issue, error) {
	var rows []model.Issue
	err := r.db.WithContext(ctx).
		Joins("JOIN issue_test_results itr ON itr.issue_id = issues.id").
		Where("itr.test_result_id = ?", testResultID).
		Order("issues.created_at DESC").
		Find(&rows).Error
	if err != nil {
		return nil, apperror.Internal(err)
	}
	return toDomainIssues(rows)
}

func (r *IssueRepository) FindByID(ctx context.Context, id string) (*issue.Issue, error) {
	var m model.Issue
	if err := r.db.WithContext(ctx).First(&m, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("issue not found")
		}
		return nil, apperror.Internal(err)
	}
	return toDomainIssue(m)
}

func (r *IssueRepository) Create(ctx context.Context, i *issue.Issue) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if i.Code == "" {
			code, err := entitycode.Next(ctx, tx, i.ProjectID, issueCodePrefix)
			if err != nil {
				return apperror.Internal(err)
			}
			i.Code = code
		}
		m, err := fromDomainIssue(i)
		if err != nil {
			return apperror.Internal(err)
		}
		if err := tx.Create(&m).Error; err != nil {
			if isDuplicateKeyErr(err) {
				return apperror.Conflict("an issue with this code already exists in this project")
			}
			return apperror.Internal(err)
		}
		domainIssue, err := toDomainIssue(m)
		if err != nil {
			return apperror.Internal(err)
		}
		*i = *domainIssue
		return nil
	})
}

func (r *IssueRepository) Update(ctx context.Context, i *issue.Issue) error {
	m, err := fromDomainIssue(i)
	if err != nil {
		return apperror.Internal(err)
	}
	updateErr := r.db.WithContext(ctx).Model(&model.Issue{}).Where("id = ?", i.ID).Updates(map[string]any{
		"title":           m.Title,
		"description":     m.Description,
		"actual_result":   m.ActualResult,
		"expected_result": m.ExpectedResult,
		"priority":        m.Priority,
		"type":            m.Type,
		"module_id":       m.ModuleID,
		"github_links":    m.GithubLinks,
	}).Error
	if updateErr != nil {
		return apperror.Internal(updateErr)
	}
	return nil
}

func (r *IssueRepository) UpdateStatus(ctx context.Context, id string, status issue.Status) (*issue.Issue, error) {
	if err := r.db.WithContext(ctx).Model(&model.Issue{}).Where("id = ?", id).Update("status", string(status)).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindByID(ctx, id)
}

func (r *IssueRepository) Assign(ctx context.Context, id string, assignedTo *string) (*issue.Issue, error) {
	if err := r.db.WithContext(ctx).Model(&model.Issue{}).Where("id = ?", id).Update("assigned_to", assignedTo).Error; err != nil {
		return nil, apperror.Internal(err)
	}
	return r.FindByID(ctx, id)
}

func (r *IssueRepository) Delete(ctx context.Context, id string) error {
	if err := r.db.WithContext(ctx).Delete(&model.Issue{}, "id = ?", id).Error; err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *IssueRepository) LinkToTestResult(ctx context.Context, issueID, testResultID string) error {
	link := model.IssueTestResult{ID: uuid.NewString(), IssueID: issueID, TestResultID: testResultID}
	err := r.db.WithContext(ctx).
		Where("issue_id = ? AND test_result_id = ?", issueID, testResultID).
		FirstOrCreate(&link).Error
	if err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *IssueRepository) UnlinkFromTestResult(ctx context.Context, issueID, testResultID string) error {
	err := r.db.WithContext(ctx).
		Where("issue_id = ? AND test_result_id = ?", issueID, testResultID).
		Delete(&model.IssueTestResult{}).Error
	if err != nil {
		return apperror.Internal(err)
	}
	return nil
}

func (r *IssueRepository) ReplaceTags(ctx context.Context, issueID string, tagIDs []string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("issue_id = ?", issueID).Delete(&model.IssueTag{}).Error; err != nil {
			return apperror.Internal(err)
		}
		if len(tagIDs) == 0 {
			return nil
		}
		rows := make([]model.IssueTag, len(tagIDs))
		for i, tagID := range tagIDs {
			rows[i] = model.IssueTag{ID: uuid.NewString(), IssueID: issueID, TagID: tagID}
		}
		if err := tx.Create(&rows).Error; err != nil {
			return apperror.Internal(err)
		}
		return nil
	})
}

func toDomainIssues(rows []model.Issue) ([]issue.Issue, error) {
	result := make([]issue.Issue, len(rows))
	for i, row := range rows {
		d, err := toDomainIssue(row)
		if err != nil {
			return nil, apperror.Internal(err)
		}
		result[i] = *d
	}
	return result, nil
}

func toDomainIssue(m model.Issue) (*issue.Issue, error) {
	var links []issue.GithubLink
	if m.GithubLinks != "" {
		if err := json.Unmarshal([]byte(m.GithubLinks), &links); err != nil {
			return nil, err
		}
	}
	if links == nil {
		links = []issue.GithubLink{}
	}
	return &issue.Issue{
		ID:             m.ID,
		ProjectID:      m.ProjectID,
		ModuleID:       m.ModuleID,
		Code:           m.Code,
		Type:           issue.Type(m.Type),
		Title:          m.Title,
		Description:    m.Description,
		ActualResult:   m.ActualResult,
		ExpectedResult: m.ExpectedResult,
		Priority:       issue.Priority(m.Priority),
		Status:         issue.Status(m.Status),
		AssignedTo:     m.AssignedTo,
		GithubLinks:    links,
		CreatedAt:      m.CreatedAt,
		UpdatedAt:      m.UpdatedAt,
	}, nil
}

func fromDomainIssue(i *issue.Issue) (model.Issue, error) {
	links := i.GithubLinks
	if links == nil {
		links = []issue.GithubLink{}
	}
	raw, err := json.Marshal(links)
	if err != nil {
		return model.Issue{}, err
	}
	return model.Issue{
		ID:             i.ID,
		ProjectID:      i.ProjectID,
		ModuleID:       i.ModuleID,
		Code:           i.Code,
		Type:           string(i.Type),
		Title:          i.Title,
		Description:    i.Description,
		ActualResult:   i.ActualResult,
		ExpectedResult: i.ExpectedResult,
		Priority:       string(i.Priority),
		Status:         string(i.Status),
		AssignedTo:     i.AssignedTo,
		GithubLinks:    string(raw),
	}, nil
}
