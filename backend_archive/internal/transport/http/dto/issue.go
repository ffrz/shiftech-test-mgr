package dto

import (
	"time"

	"github.com/shiftech/testmgr-backend/internal/domain/issue"
)

type GithubLinkRequest struct {
	URL   string `json:"url" validate:"required"`
	Label string `json:"label"`
}

type CreateIssueRequest struct {
	ModuleID           *string             `json:"module_id"`
	Type               string              `json:"type" validate:"omitempty,oneof=bug feature improvement task"`
	Title              string              `json:"title" validate:"required,min=1,max=500"`
	Description        string              `json:"description"`
	ActualResult       string              `json:"actual_result"`
	ExpectedResult     string              `json:"expected_result"`
	Priority           string              `json:"priority" validate:"omitempty,oneof=low medium high critical"`
	GithubLinks        []GithubLinkRequest `json:"github_links"`
	TagIDs             []string            `json:"tag_ids"`
	LinkToTestResultID *string             `json:"link_to_test_result_id"`
}

type UpdateIssueRequest struct {
	ModuleID       *string             `json:"module_id"`
	Type           string              `json:"type" validate:"required,oneof=bug feature improvement task"`
	Title          string              `json:"title" validate:"required,min=1,max=500"`
	Description    string              `json:"description"`
	ActualResult   string              `json:"actual_result"`
	ExpectedResult string              `json:"expected_result"`
	Priority       string              `json:"priority" validate:"required,oneof=low medium high critical"`
	GithubLinks    []GithubLinkRequest `json:"github_links"`
	// TagIDs nil means "leave tags untouched" -- see issue.UpdateInput.
	TagIDs []string `json:"tag_ids"`
}

type ChangeIssueStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=open in_progress resolved verified closed"`
}

type AssignIssueRequest struct {
	AssignedTo *string `json:"assigned_to"`
}

type LinkIssueTestResultRequest struct {
	TestResultID string `json:"test_result_id" validate:"required"`
}

func toDomainGithubLinks(reqs []GithubLinkRequest) []issue.GithubLink {
	links := make([]issue.GithubLink, len(reqs))
	for i, l := range reqs {
		links[i] = issue.GithubLink{URL: l.URL, Label: l.Label}
	}
	return links
}

type GithubLinkResponse struct {
	URL   string `json:"url"`
	Label string `json:"label,omitempty"`
}

type IssueResponse struct {
	ID             string               `json:"id"`
	ProjectID      string               `json:"project_id"`
	ModuleID       *string              `json:"module_id"`
	Code           string               `json:"code"`
	Type           string               `json:"type"`
	Title          string               `json:"title"`
	Description    string               `json:"description"`
	ActualResult   string               `json:"actual_result"`
	ExpectedResult string               `json:"expected_result"`
	Priority       string               `json:"priority"`
	Status         string               `json:"status"`
	AssignedTo     *string              `json:"assigned_to"`
	GithubLinks    []GithubLinkResponse `json:"github_links"`
	CreatedAt      time.Time            `json:"created_at"`
	UpdatedAt      time.Time            `json:"updated_at"`
}

func FromIssue(i issue.Issue) IssueResponse {
	links := make([]GithubLinkResponse, len(i.GithubLinks))
	for idx, l := range i.GithubLinks {
		links[idx] = GithubLinkResponse{URL: l.URL, Label: l.Label}
	}
	return IssueResponse{
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
		GithubLinks:    links,
		CreatedAt:      i.CreatedAt,
		UpdatedAt:      i.UpdatedAt,
	}
}

func FromIssues(issues []issue.Issue) []IssueResponse {
	result := make([]IssueResponse, len(issues))
	for i, is := range issues {
		result[i] = FromIssue(is)
	}
	return result
}
