package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// TestPlanHandler is the REST transport for Test Plans — parse request, call
// service.TestPlanService, serialize response. No business logic here.
// Mutations carry the authenticated user as actor for activity logging.
type TestPlanHandler struct {
	Service *service.TestPlanService
}

// ── List ────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-plans
// Query: status, search, cursor, limit
func (h *TestPlanHandler) List(c echo.Context) error {
	filter := core.TestPlanFilter{
		ProjectID: c.Param("project_id"),
		Limit:     50,
	}
	if v := c.QueryParam("status"); v != "" {
		s := core.TestPlanStatus(v)
		filter.Status = &s
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
		result = &core.PageResult[core.TestPlan]{}
	}
	return c.JSON(http.StatusOK, result)
}

// ── Get ─────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-plans/:id
func (h *TestPlanHandler) Get(c echo.Context) error {
	tp, err := h.Service.Get(c.Request().Context(), c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if tp == nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "test plan not found"})
	}
	return c.JSON(http.StatusOK, tp)
}

// ── Create ──────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-plans
func (h *TestPlanHandler) Create(c echo.Context) error {
	projectID := c.Param("project_id")
	var input core.CreateTestPlanInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	input.ProjectID = projectID

	tp, err := h.Service.Create(c.Request().Context(), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, tp)
}

// ── AddCases ────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-plans/:id/cases
// Body: {"caseIds": ["uuid1", "uuid2"]}
func (h *TestPlanHandler) AddCases(c echo.Context) error {
	var body struct {
		CaseIDs []string `json:"caseIds"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	if len(body.CaseIDs) == 0 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "caseIds is required"})
	}

	if err := h.Service.AddCases(c.Request().Context(), c.Param("id"), body.CaseIDs); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── RemoveCases ─────────────────────────────────────────────────────────
//
// DELETE /api/v1/projects/:project_id/test-plans/:id/cases
// Body: {"caseIds": ["uuid1", "uuid2"]}
func (h *TestPlanHandler) RemoveCases(c echo.Context) error {
	var body struct {
		CaseIDs []string `json:"caseIds"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	if len(body.CaseIDs) == 0 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "caseIds is required"})
	}

	if err := h.Service.RemoveCases(c.Request().Context(), c.Param("id"), body.CaseIDs); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── Approve ─────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-plans/:id/approve
func (h *TestPlanHandler) Approve(c echo.Context) error {
	actorID := auth.UserID(c)

	if err := h.Service.Approve(c.Request().Context(), c.Param("id"), actorID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── ChangeStatus ────────────────────────────────────────────────────────
//
// PATCH /api/v1/projects/:project_id/test-plans/:id/status
// Body: {"status": "active"}
func (h *TestPlanHandler) ChangeStatus(c echo.Context) error {
	projectID := c.Param("project_id")

	var body struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	actorID := auth.UserID(c)
	status := core.TestPlanStatus(body.Status)

	if err := h.Service.ChangeStatus(c.Request().Context(), c.Param("id"), status, actorID, projectID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}
