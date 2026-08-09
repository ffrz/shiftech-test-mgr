package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/rest-api/internal/auth"
	"github.com/shiftech/testify-platform/service"
)

// TestCaseHandler is the REST transport for Test Cases — parse request, call
// service.TestCaseService, serialize response. No business logic here.
// Mutations carry the authenticated user as actor for activity logging.
type TestCaseHandler struct {
	Service *service.TestCaseService
}

// ── List ────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-cases
// Query: module_id, module, tag, priority, status, step_type, search, cursor, limit
func (h *TestCaseHandler) List(c echo.Context) error {
	filter := core.TestCaseFilter{
		ProjectID: c.Param("project_id"),
		Limit:     50,
	}
	if v := c.QueryParam("module_id"); v != "" {
		filter.ModuleID = &v
	}
	if v := c.QueryParam("module"); v != "" {
		filter.Module = &v
	}
	if v := c.QueryParam("tag"); v != "" {
		filter.Tag = &v
	}
	if v := c.QueryParam("priority"); v != "" {
		p := core.TestCasePriority(v)
		filter.Priority = &p
	}
	if v := c.QueryParam("status"); v != "" {
		s := core.TestCaseStatus(v)
		filter.Status = &s
	}
	if v := c.QueryParam("step_type"); v != "" {
		st := core.StepType(v)
		filter.StepType = &st
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
		result = &core.PageResult[core.TestCase]{}
	}
	return c.JSON(http.StatusOK, result)
}

// ── Get ─────────────────────────────────────────────────────────────────
//
// GET /api/v1/projects/:project_id/test-cases/:id
func (h *TestCaseHandler) Get(c echo.Context) error {
	tc, err := h.Service.Get(c.Request().Context(), c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if tc == nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "test case not found"})
	}
	return c.JSON(http.StatusOK, tc)
}

// ── Create ──────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-cases
func (h *TestCaseHandler) Create(c echo.Context) error {
	projectID := c.Param("project_id")
	var input core.CreateTestCaseInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	input.ProjectID = projectID

	tc, err := h.Service.Create(c.Request().Context(), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, tc)
}

// ── Update ──────────────────────────────────────────────────────────────
//
// PATCH /api/v1/projects/:project_id/test-cases/:id
func (h *TestCaseHandler) Update(c echo.Context) error {
	var input core.UpdateTestCaseInput
	if err := c.Bind(&input); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}

	tc, err := h.Service.Update(c.Request().Context(), c.Param("id"), input)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, tc)
}

// ── Duplicate ───────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-cases/:id/duplicate
// Body: {"title": "Copied Test Case Name"}
func (h *TestCaseHandler) Duplicate(c echo.Context) error {
	var body struct {
		Title string `json:"title"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": err.Error()})
	}
	if body.Title == "" {
		body.Title = "Copy of test case"
	}

	tc, err := h.Service.Duplicate(c.Request().Context(), c.Param("id"), body.Title)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusCreated, tc)
}

// ── Archive ─────────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-cases/:id/archive
func (h *TestCaseHandler) Archive(c echo.Context) error {
	projectID := c.Param("project_id")
	actorID := auth.UserID(c)

	if err := h.Service.Archive(c.Request().Context(), c.Param("id"), actorID, projectID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}

// ── Reactivate ──────────────────────────────────────────────────────────
//
// POST /api/v1/projects/:project_id/test-cases/:id/reactivate
func (h *TestCaseHandler) Reactivate(c echo.Context) error {
	projectID := c.Param("project_id")
	actorID := auth.UserID(c)

	if err := h.Service.Reactivate(c.Request().Context(), c.Param("id"), actorID, projectID); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.NoContent(http.StatusOK)
}
