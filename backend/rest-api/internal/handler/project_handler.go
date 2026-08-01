package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/shiftech/testify-platform/core"
)

// ProjectHandler is a thin transport layer: parse request, call the
// repository interface, serialize the response. No business logic here —
// same rule as the MCP tool handlers (see ARCHITECTURE.md principle #4).
type ProjectHandler struct {
	Repo core.ProjectRepository
}

func (h *ProjectHandler) List(c echo.Context) error {
	projects, err := h.Repo.List(c.Request().Context(), core.ProjectFilter{Limit: 50})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}
	return c.JSON(http.StatusOK, projects)
}
