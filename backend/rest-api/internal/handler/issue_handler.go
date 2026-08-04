package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// IssueHandler is the REST transport for Issues — parse request, call
// service.IssueService, serialize response. No business logic here (same
// rule as the MCP tool handlers, see ARCHITECTURE.md principle #5). All
// mutations carry an actor (the authenticated user) so the service layer
// can log activity and emit notifications without the transport knowing
// those details.
type IssueHandler struct {
	Service *service.IssueService
}

// ── Request shapes ─────────────────────────────────────────────────────

type issueUpdateStatusReq struct {
	Status string `json:"status"`
}

type issueAssignReq struct {
	AssignedTo *string `json:"assignedTo"`
}

// ── List ────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/issues
// Query: type, status, priority, assignee_id, testrun_id, testcase_id,
//
//	search, cursor, limit
func (h *IssueHandler) List(c echo.Context) error {
	filter := core.IssueFilter{
		ProjectID: c.Param("project_id"),
		Limit:     50,
	}
	if v := c.QueryParam("type"); v != "" {
		t := core.IssueType(v)
		filter.Type = &t
	}
	if v := c.QueryParam("status"); v != "" {
		s := core.IssueStatus(v)
		filter.Status = &s
	}
	if v := c.QueryParam("priority"); v != "" {
		p := core.IssuePriority(v)
		filter.Priority = &p
	}
	if v := c.QueryParam("assignee_id"); v != "" {
		filter.AssigneeID = &v
	}
	if v := c.QueryParam("testrun_id"); v != "" {
		filter.RunID = &v
	}
	if v := c.QueryParam("testcase_id"); v != "" {
		filter.CaseID = &v
	}
	if v := c.QueryParam("search"); v != "" {
		filter.Search = &v
	}
	if v := c.QueryParam("cursor"); v != "" {
		filter.Cursor = &v
	}

	result, err := h.Service.List(c.Request().Context(), filter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if result == nil {
		result = &core.PageResult[core.Issue]{}
	}
	return c.JSON(http.StatusOK, result)
}

// ── Get / Inspect ──────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/issues/:id
// Query: ?detail=inspect  (default: plain Get)
//
// When ?detail=inspect, :id can be a UUID or human code ("ISS-0072").
func (h *IssueHandler) Get(c echo.Context) error {
	projectID := c.Param("project_id")
	id := c.Param("id")

	if c.QueryParam("detail") == "inspect" {
		result, err := h.Service.Inspect(c.Request().Context(), projectID, id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, result)
	}

	issue, err := h.Service.Get(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if issue == nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "issue not found"})
	}
	return c.JSON(http.StatusOK, issue)
}

// ── Create ──────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/issues
func (h *IssueHandler) Create(c echo.Context) error {
	projectID := c.Param("project_id")

	var input core.CreateIssueInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	input.ProjectID = projectID

	issue, err := h.Service.Create(c.Request().Context(), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, issue)
}

// ── UpdateStatus ────────────────────────────────────────────────────────
//
// PATCH /api/v1/projects/:project_id/issues/:id/status
func (h *IssueHandler) UpdateStatus(c echo.Context) error {
	projectID := c.Param("project_id")
	id := c.Param("id")

	var req issueUpdateStatusReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	actorID := auth.UserID(c)
	status := core.IssueStatus(req.Status)

	issue, err := h.Service.UpdateStatus(c.Request().Context(), id, status, actorID, projectID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, issue)
}

// ── Assign ──────────────────────────────────────────────────────────────
//
// PATCH /api/v1/projects/:project_id/issues/:id/assign
func (h *IssueHandler) Assign(c echo.Context) error {
	projectID := c.Param("project_id")
	id := c.Param("id")

	var req issueAssignReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	actorID := auth.UserID(c)
	issue, err := h.Service.Assign(c.Request().Context(), id, req.AssignedTo, actorID, projectID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, issue)
}
