package handler

import (
	"github.com/labstack/echo/v4"

	"github.com/shiftech/testmgr-backend/internal/domain/apperror"
	"github.com/shiftech/testmgr-backend/internal/domain/project"
	projectsvc "github.com/shiftech/testmgr-backend/internal/service/project"
	"github.com/shiftech/testmgr-backend/internal/transport/http/dto"
	"github.com/shiftech/testmgr-backend/internal/transport/http/response"
	"github.com/shiftech/testmgr-backend/platform/eventbus"
)

type ProjectHandler struct {
	svc    *projectsvc.Service
	events eventbus.Broadcaster
}

func NewProjectHandler(svc *projectsvc.Service, events eventbus.Broadcaster) *ProjectHandler {
	return &ProjectHandler{svc: svc, events: events}
}

// List supports the same search/status/sort query params as the frontend's
// ProjectQuery (ARCHITECTURE.md §6.5) — filtering/sorting happens in the
// database, not here.
func (h *ProjectHandler) List(c echo.Context) error {
	query := project.Query{
		Search:        c.QueryParam("search"),
		Status:        project.Status(c.QueryParam("status")),
		SortField:     project.SortField(c.QueryParam("sort_field")),
		SortDirection: project.SortDirection(c.QueryParam("sort_direction")),
	}
	if query.Status == "all" {
		query.Status = ""
	}

	projects, err := h.svc.List(c.Request().Context(), query)
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromProjects(projects))
}

func (h *ProjectHandler) GetByID(c echo.Context) error {
	p, err := h.svc.GetByID(c.Request().Context(), c.Param("id"))
	if err != nil {
		return err
	}
	return response.OK(c, dto.FromProject(*p))
}

func (h *ProjectHandler) Create(c echo.Context) error {
	var req dto.CreateProjectRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.Create(c.Request().Context(), projectsvc.CreateInput{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "projects", Action: "insert", Data: dto.FromProject(*p)})
	return response.Created(c, dto.FromProject(*p))
}

func (h *ProjectHandler) Update(c echo.Context) error {
	var req dto.UpdateProjectRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.Update(c.Request().Context(), c.Param("id"), projectsvc.UpdateInput{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "projects", Action: "update", Data: dto.FromProject(*p)})
	return response.OK(c, dto.FromProject(*p))
}

func (h *ProjectHandler) ChangeStatus(c echo.Context) error {
	var req dto.ChangeProjectStatusRequest
	if err := dto.BindAndValidate(c, &req); err != nil {
		return err
	}

	p, err := h.svc.ChangeStatus(c.Request().Context(), c.Param("id"), project.Status(req.Status))
	if err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "projects", Action: "update", Data: dto.FromProject(*p)})
	return response.OK(c, dto.FromProject(*p))
}

func (h *ProjectHandler) DeletePermanently(c echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return apperror.Validation("project id is required", nil)
	}
	if err := h.svc.DeletePermanently(c.Request().Context(), id); err != nil {
		return err
	}

	h.events.Publish(c.Request().Context(), eventbus.Event{Table: "projects", Action: "delete", Data: map[string]string{"id": id}})
	return response.NoContent(c)
}
