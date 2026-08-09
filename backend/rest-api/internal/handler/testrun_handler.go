package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// TestRunHandler is the REST transport for Test Runs — parse request, call
// service.TestRunService, serialize response. No business logic here.
// Mutations carry the authenticated user as actor for activity logging.
type TestRunHandler struct {
	Service *service.TestRunService
}

// ── List ────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-runs
// Query: status, plan_id, tester_id, cursor, limit
func (h *TestRunHandler) List(c echo.Context) error {
	filter := core.TestRunFilter{
		ProjectID: c.Param("project_id"),
		Limit:     50,
	}
	if v := c.QueryParam("status"); v != "" {
		s := core.TestRunStatus(v)
		filter.Status = &s
	}
	if v := c.QueryParam("plan_id"); v != "" {
		filter.PlanID = &v
	}
	if v := c.QueryParam("tester_id"); v != "" {
		filter.TesterID = &v
	}
	if v := c.QueryParam("cursor"); v != "" {
		filter.Cursor = &v
	}

	result, err := h.Service.List(c.Request().Context(), filter)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if result == nil {
		result = &core.PageResult[core.TestRun]{}
	}
	return c.JSON(http.StatusOK, result)
}

// ── Get ─────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-runs/:id
// Query: ?detail=summary  (default: plain Get)
func (h *TestRunHandler) Get(c echo.Context) error {
	projectID := c.Param("project_id")
	id := c.Param("id")

	if c.QueryParam("detail") == "summary" {
		d, err := h.Service.GetWithDetail(c.Request().Context(), projectID, id)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
		}
		return c.JSON(http.StatusOK, d)
	}

	tr, err := h.Service.Get(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if tr == nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "test run not found"})
	}
	return c.JSON(http.StatusOK, tr)
}

// ── Create ──────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-runs
func (h *TestRunHandler) Create(c echo.Context) error {
	projectID := c.Param("project_id")
	var input core.CreateTestRunInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	input.ProjectID = projectID

	tr, err := h.Service.Create(c.Request().Context(), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, tr)
}

// ── RecordResult ────────────────────────────────────────────────────────
//
// PATCH /api/v1/projects/:project_id/test-runs/:id/results/:result_id
// Body: {"status": "pass", "testerId": "...", "notes": "..."}
func (h *TestRunHandler) RecordResult(c echo.Context) error {
	var input core.RecordResultInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	if err := h.Service.RecordResult(c.Request().Context(), c.Param("result_id"), input); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── Complete ────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-runs/:id/complete
func (h *TestRunHandler) Complete(c echo.Context) error {
	projectID := c.Param("project_id")
	actorID := auth.UserID(c)

	if err := h.Service.Complete(c.Request().Context(), c.Param("id"), actorID, projectID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── Reopen ──────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-runs/:id/reopen
func (h *TestRunHandler) Reopen(c echo.Context) error {
	projectID := c.Param("project_id")
	actorID := auth.UserID(c)

	if err := h.Service.Reopen(c.Request().Context(), c.Param("id"), actorID, projectID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── Summary ─────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-runs/:id/summary
func (h *TestRunHandler) Summary(c echo.Context) error {
	summary, err := h.Service.Summary(c.Request().Context(), c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, summary)
}
