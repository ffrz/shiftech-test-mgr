package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
	"github.com/shiftech/testify-platform/service"
)

// ProjectHandler is a thin transport layer: parse request, call the
// service, serialize the response. No business logic here — same rule as
// the MCP tool handlers (see ARCHITECTURE.md principle #5). Calls
// service.ProjectService rather than core.ProjectRepository directly, so
// any business rule added to the service is shared with the MCP transport
// automatically.
type ProjectHandler struct {
	Service *service.ProjectService
}

func (h *ProjectHandler) List(c echo.Context) error {
	projects, err := h.Service.List(c.Request().Context(), core.ProjectFilter{Limit: 50})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, projects)
}

func (h *ProjectHandler) Get(c echo.Context) error {
	id := c.Param("id")
	project, err := h.Service.Get(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	if project == nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "project not found"})
	}
	return c.JSON(http.StatusOK, project)
}
