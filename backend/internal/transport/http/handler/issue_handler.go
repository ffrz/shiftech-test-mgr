package handler

import (
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/issue"
	issuesvc "github.com/shiftech/testmgr-backend/internal/service/issue"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type IssueHandler struct {
	svc    *issuesvc.Service
	events eventbus.Broadcaster
}

func NewIssueHandler(svc *issuesvc.Service, events eventbus.Broadcaster) *IssueHandler {
	return &IssueHandler{svc: svc, events: events}
}

func (h *IssueHandler) List(c echo.Context) error {
	limit := 0
	if v := c.QueryParam("limit"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			limit = parsed
		}
	}
	issues, err := h.svc.ListByProject(c.Request().Context(), c.Param("projectId"), c.QueryParam("search"), limit)
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromIssues(issues))
}

func (h *IssueHandler) ListByTestRun(c echo.Context) error {
	issues, err := h.svc.ListByTestRun(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromIssues(issues))
}

func (h *IssueHandler) ListByTestResult(c echo.Context) error {
	issues, err := h.svc.ListByTestResult(c.Request().Context(), c.Param("resultId"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromIssues(issues))
}

func (h *IssueHandler) GetByID(c echo.Context) error {
	i, err := h.svc.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromIssue(*i))
}

func (h *IssueHandler) Create(c echo.Context) error {
	var req dto.CreateIssueRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	links := make([]issue.GithubLink, len(req.GithubLinks))
	for i, l := range req.GithubLinks {
		links[i] = issue.GithubLink{URL: l.URL, Label: l.Label}
	}

	i, err := h.svc.Create(c.Request().Context(), issuesvc.CreateInput{
		ProjectID:          c.Param("projectId"),
		ModuleID:           req.ModuleID,
		Type:               issue.Type(req.Type),
		Title:              req.Title,
		Description:        req.Description,
		ActualResult:       req.ActualResult,
		ExpectedResult:     req.ExpectedResult,
		Priority:           issue.Priority(req.Priority),
		GithubLinks:        links,
		TagIDs:             req.TagIDs,
		LinkToTestResultID: req.LinkToTestResultID,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issues", Action: "insert", Data: dto.FromIssue(*i)})
	return response.Created(c, dto.FromIssue(*i))
}

func (h *IssueHandler) Update(c echo.Context) error {
	var req dto.UpdateIssueRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	links := make([]issue.GithubLink, len(req.GithubLinks))
	for i, l := range req.GithubLinks {
		links[i] = issue.GithubLink{URL: l.URL, Label: l.Label}
	}

	i, err := h.svc.Update(c.Request().Context(), c.Param("id"), issuesvc.UpdateInput{
		Title:          req.Title,
		Description:    req.Description,
		ActualResult:   req.ActualResult,
		ExpectedResult: req.ExpectedResult,
		Priority:       issue.Priority(req.Priority),
		Type:           issue.Type(req.Type),
		ModuleID:       req.ModuleID,
		GithubLinks:    links,
		TagIDs:         req.TagIDs,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issues", Action: "update", Data: dto.FromIssue(*i)})
	return response.OK(c, dto.FromIssue(*i))
}

func (h *IssueHandler) ChangeStatus(c echo.Context) error {
	var req dto.ChangeIssueStatusRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	i, err := h.svc.ChangeStatus(c.Request().Context(), c.Param("id"), issue.Status(req.Status))
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issues", Action: "update", Data: dto.FromIssue(*i)})
	return response.OK(c, dto.FromIssue(*i))
}

func (h *IssueHandler) Assign(c echo.Context) error {
	var req dto.AssignIssueRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	i, err := h.svc.Assign(c.Request().Context(), c.Param("id"), req.AssignedTo)
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issues", Action: "update", Data: dto.FromIssue(*i)})
	return response.OK(c, dto.FromIssue(*i))
}

func (h *IssueHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("issue id is required", nil)
	}
	if err := h.svc.Remove(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issues", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}

func (h *IssueHandler) LinkTestResult(c echo.Context) error {
	var req dto.LinkIssueTestResultRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	issueID := c.Param("id")
	if err := h.svc.LinkToTestResult(c.Request().Context(), issueID, req.TestResultID); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issue_test_results", Action: "insert", Data: map[string]string{"issue_id": issueID, "test_result_id": req.TestResultID}})
	return response.NoContent(c)
}

func (h *IssueHandler) UnlinkTestResult(c echo.Context) error {
	issueID := c.Param("id")
	testResultID := c.Param("resultId")
	if err := h.svc.UnlinkFromTestResult(c.Request().Context(), issueID, testResultID); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "issue_test_results", Action: "delete", Data: map[string]string{"issue_id": issueID, "test_result_id": testResultID}})
	return response.NoContent(c)
}
